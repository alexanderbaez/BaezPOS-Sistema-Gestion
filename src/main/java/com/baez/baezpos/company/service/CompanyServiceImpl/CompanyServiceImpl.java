package com.baez.baezpos.company.service.CompanyServiceImpl;

import com.baez.baezpos.company.dto.CompanyDTO;
import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.company.repository.CompanyRepository;
import com.baez.baezpos.company.service.CompanyService.CompanyService;
import com.baez.baezpos.user.dto.UserDTO;
import com.baez.baezpos.user.entity.User;
import com.baez.baezpos.user.entity.Role;
import com.baez.baezpos.user.repository.UserRepository;
import com.baez.baezpos.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository; // Inyectado
    private final PasswordEncoder passwordEncoder; // Inyectado

    // --- MÉTODOS DE EMPRESA ---

    @Override
    @Transactional(readOnly = true)
    public CompanyDTO getAuthenticatedCompany() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        Company company = companyRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Empresa no encontrada"));
        return convertToDTOClient(company);
    }

    @Override
    @Transactional
    public CompanyDTO updateAuthenticatedCompany(CompanyDTO dto) {
        Company company = getAuthenticatedEntity();
        company.setName(dto.getName());
        company.setAddress(dto.getAddress());
        company.setPhone(dto.getPhone());
        company.setTicketMessage(dto.getTicketMessage());
        return convertToDTOClient(companyRepository.save(company));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> verificarEstadoSuscripcionAutenticada() {
        // Usamos el método privado que ya tenés para buscar la entidad
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Usuario no encontrado"));

        Company company = user.getCompany();
        LocalDate hoy = LocalDate.now();
        boolean isExpired = company.getExpirationDate() != null && hoy.isAfter(company.getExpirationDate());

        // --- EL BLOQUEO DE ALEXANDER ---
        // Si la empresa no está activa O la fecha ya pasó
        if (Boolean.FALSE.equals(company.getActive()) || isExpired) {
            // Lanzamos una excepción que Spring convertirá en un error para el JS
            throw new org.springframework.security.access.AccessDeniedException("CUENTA_SUSPENDIDA");
        }

        // Si todo está OK, devolvemos los datos normales
        long dias = (company.getExpirationDate() != null) ?
                java.time.temporal.ChronoUnit.DAYS.between(hoy, company.getExpirationDate()) : 0;

        Map<String, Object> res = new HashMap<>();
        res.put("companyName", company.getName());
        res.put("vencido", false);
        res.put("diasRestantes", dias);
        res.put("active", true);
        return res;
    }

    // --- MÉTODOS DE EMPLEADOS (CAJEROS) ---

    @Override
    @Transactional(readOnly = true)
    public List<UserDTO> getMyEmployees() {
        User admin = getAuthenticatedUser();
        return userRepository.findAllByCompanyId(admin.getCompany().getId())
                .stream()
                .filter(u -> u.getRole() == Role.CAJERO) // Solo cajeros
                .map(this::convertToUserDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserDTO createEmployee(UserDTO dto) {
        User admin = getAuthenticatedUser();
        User employee = User.builder()
                .name(dto.getName())
                .email(dto.getEmail())
                .password(passwordEncoder.encode(dto.getPassword()))
                .role(Role.CAJERO)
                .company(admin.getCompany())
                .active(true)
                .build();
        return convertToUserDTO(userRepository.save(employee));
    }

    @Override
    @Transactional
    public UserDTO updateEmployee(Long id, UserDTO dto) {
        User admin = getAuthenticatedUser();
        User employee = userRepository.findById(id)
                .filter(u -> u.getCompany().getId().equals(admin.getCompany().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("No pertenece a su empresa"));

        employee.setName(dto.getName());
        employee.setActive(dto.getActive());
        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            employee.setPassword(passwordEncoder.encode(dto.getPassword()));
        }
        return convertToUserDTO(userRepository.save(employee));
    }

    @Override
    @Transactional
    public void deleteEmployee(Long id) {
        User admin = getAuthenticatedUser();
        User employee = userRepository.findById(id)
                .filter(u -> u.getCompany().getId().equals(admin.getCompany().getId()))
                .orElseThrow(() -> new ResourceNotFoundException("Acceso denegado"));
        userRepository.delete(employee);
    }

    @Override
    public void validarAcceso(Long companyId) {
        Company company = companyRepository.findById(companyId).orElseThrow();
        if (!company.getActive() || (company.getExpirationDate() != null && company.getExpirationDate().isBefore(LocalDate.now()))) {
            throw new RuntimeException("ACCESO DENEGADO");
        }
    }

    // --- MÉTODOS PRIVADOS DE APOYO ---

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }

    private Company getAuthenticatedEntity() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return companyRepository.findByEmail(email).orElseThrow();
    }

    private CompanyDTO convertToDTOClient(Company entity) {
        return CompanyDTO.builder()
                .id(entity.getId()).name(entity.getName()).address(entity.getAddress())
                .phone(entity.getPhone()).taxId(entity.getTaxId()).ticketMessage(entity.getTicketMessage())
                .expirationDate(entity.getExpirationDate()).email(entity.getEmail())
                .active(entity.getActive()).build();
    }

    private UserDTO convertToUserDTO(User user) {
        return UserDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .active(user.getActive())
                // No devolvemos el password por seguridad
                .build();
    }
}