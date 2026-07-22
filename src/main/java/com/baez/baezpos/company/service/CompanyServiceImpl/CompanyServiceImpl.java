package com.baez.baezpos.company.service.CompanyServiceImpl;

import com.baez.baezpos.company.dto.CompanyDTO;
import com.baez.baezpos.company.dto.MasterRegistrationRequest;
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
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    // Método auxiliar para obtener la única configuración del local
    private Company getLocalConfig() {
        return companyRepository.findAll().stream()
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Debe configurar los datos del local"));
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyDTO getAuthenticatedCompany() {
        return convertToDTOClient(getLocalConfig());
    }

    @Override
    @Transactional
    public CompanyDTO updateAuthenticatedCompany(CompanyDTO dto) {
        Company company = getLocalConfig();
        company.setName(dto.getName());
        company.setAddress(dto.getAddress());
        company.setPhone(dto.getPhone());
        company.setEmail(dto.getEmail()); // Se agrega la actualización del email
        company.setTaxId(dto.getTaxId());
        company.setTicketMessage(dto.getTicketMessage());

        // --- GUARDAR ESTADO Y DATOS FISCALES ---
        company.setHasTaxData(dto.getHasTaxData() != null ? dto.getHasTaxData() : true);
        company.setIibb(dto.getIibb());
        company.setInicioActividades(dto.getInicioActividades());
        company.setCondicionIva(dto.getCondicionIva());

        return convertToDTOClient(companyRepository.save(company));
    }

    @Override
    @Transactional(readOnly = true)
    public Map<String, Object> verificarEstadoSuscripcionAutenticada() {
        Company company = getLocalConfig();
        LocalDate hoy = LocalDate.now();
        boolean isExpired = company.getExpirationDate() != null && hoy.isAfter(company.getExpirationDate());

        if (Boolean.FALSE.equals(company.getActive()) || isExpired) {
            throw new org.springframework.security.access.AccessDeniedException("CUENTA_SUSPENDIDA");
        }

        Map<String, Object> res = new HashMap<>();
        res.put("companyName", company.getName());
        res.put("vencido", false);
        res.put("active", true);
        return res;
    }

    @Override
    @Transactional
    public UserDTO createEmployee(UserDTO dto) {
        User employee = new User();
        employee.setName(dto.getName());
        employee.setEmail(dto.getEmail());
        employee.setPassword(passwordEncoder.encode(dto.getPassword()));
        employee.setRole(Role.VENDEDOR);
        employee.setActive(true);
        return convertToUserDTO(userRepository.save(employee));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserDTO> getMyEmployees() {
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.VENDEDOR)
                .map(this::convertToUserDTO)
                .collect(Collectors.toList());
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }

    private CompanyDTO convertToDTOClient(Company entity) {
        CompanyDTO dto = new CompanyDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setAddress(entity.getAddress());
        dto.setPhone(entity.getPhone());
        dto.setEmail(entity.getEmail()); // Asignación de email solucionada
        dto.setTaxId(entity.getTaxId());
        dto.setTicketMessage(entity.getTicketMessage());
        dto.setExpirationDate(entity.getExpirationDate());
        dto.setActive(entity.getActive());

        // --- RETORNAR ESTADO Y DATOS FISCALES CON TRATAMIENTO DE NULOS ---
        dto.setHasTaxData(entity.getHasTaxData() != null ? entity.getHasTaxData() : true);
        dto.setIibb(entity.getIibb());
        dto.setInicioActividades(entity.getInicioActividades());
        dto.setCondicionIva(entity.getCondicionIva());

        return dto;
    }

    @Transactional
    public void setupInitialBusiness(MasterRegistrationRequest req) {
        Company company = Company.builder()
                .name(req.getCompanyName())
                .taxId(req.getTaxId())
                .address(req.getAddress())
                .hasTaxData(true)
                .build();
        companyRepository.save(company);

        User owner = User.builder()
                .name(req.getOwnerName())
                .email(req.getOwnerEmail())
                .password(passwordEncoder.encode(req.getOwnerPassword()))
                .role(Role.ADMIN)
                .active(true)
                .build();
        userRepository.save(owner);
    }

    private UserDTO convertToUserDTO(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole().toString());
        dto.setActive(user.getActive());
        return dto;
    }

    @Override public UserDTO updateEmployee(Long id, UserDTO dto) { return null; }
    @Override public void deleteEmployee(Long id) { }
    @Override public void validarAcceso(Long id) { }
}