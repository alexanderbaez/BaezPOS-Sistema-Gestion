package com.baez.baezpos.security.service;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.company.repository.CompanyRepository;
import com.baez.baezpos.security.JwtService;
import com.baez.baezpos.security.dto.AuthenticationRequest;
import com.baez.baezpos.security.dto.AuthenticationResponse;
import com.baez.baezpos.security.dto.SetupRequest;
import com.baez.baezpos.shared.exception.BadRequestException;
import com.baez.baezpos.user.entity.Role;
import com.baez.baezpos.user.entity.User;
import com.baez.baezpos.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.baez.baezpos.util.HardwareIdentificador; // Asegurate de que la clase que creamos antes esté aquí
import org.springframework.security.authentication.CredentialsExpiredException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final PasswordEncoder passwordEncoder;

    public AuthenticationResponse authenticate(AuthenticationRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // CHECK DE SEGURIDAD: Si está usando la clave de emergencia
        if ("admin123".equals(request.getPassword())) {
            if (user.getPasswordResetAt() == null ||
                    user.getPasswordResetAt().plusMinutes(10).isBefore(java.time.LocalDateTime.now())) {

                // CAMBIO AQUÍ: Lanzamos una excepción de seguridad que Spring no oculta tan fácilmente
                throw new CredentialsExpiredException("La clave temporal ha expirado. Solicite soporte nuevamente.");
            }
        }

        // Si pasó el tiempo bien, se autentica de forma normal
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (Exception e) {
            // Si el problema fue que pusieron mal la contraseña normal, ahí sí va el genérico
            throw new RuntimeException("Credenciales incorrectas");
        }

        if (!user.getActive()) {
            throw new RuntimeException("La cuenta se encuentra desactivada");
        }

        String jwtToken = jwtService.generateToken(user);

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                .build();
    }

    public java.util.Map<String, Boolean> getSetupStatus() {
        return java.util.Map.of("isSetupRequired", userRepository.count() == 0);
    }

    @Transactional
    public AuthenticationResponse setup(SetupRequest request) {
        long userCount = userRepository.count();
        if (userCount > 0) {
            throw new BadRequestException("El sistema ya ha sido configurado previamente. Diríjase al Login.");
        }

        Company company = Company.builder()
                .name(request.getCompanyName())
                .taxId(request.getTaxId())
                .phone(request.getPhone())
                .address(request.getAddress())
                .ticketMessage(request.getTicketMessage())
                .active(true)
                .build();
        companyRepository.save(company);

        User adminUser = User.builder()
                .name(request.getUserName())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .role(Role.ADMIN)
                .active(true)
                .build();
        userRepository.save(adminUser);

        String jwtToken = jwtService.generateToken(adminUser);

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .name(adminUser.getName())
                .email(adminUser.getEmail())
                .role(adminUser.getRole().name())
                .build();
    }

    @Transactional
    public void validarYResetearAdmin(String llaveIngresada) {
        String pcId = HardwareIdentificador.getSerialNumber();
        String llaveReal = HardwareIdentificador.generarLlaveMaestra(pcId);

        if (!llaveReal.equals(llaveIngresada)) {
            throw new RuntimeException("La llave de desbloqueo es inválida para este equipo.");
        }

        User admin = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN)
                .findFirst()
                .orElseThrow(() -> new RuntimeException("No se encontró un usuario Administrador."));

        // Reseteamos y marcamos la hora exacta
        admin.setPassword(passwordEncoder.encode("admin123"));
        admin.setPasswordResetAt(LocalDateTime.now()); // <--- ACÁ ACTIVAMOS EL RELOJ
        userRepository.save(admin);
    }
}