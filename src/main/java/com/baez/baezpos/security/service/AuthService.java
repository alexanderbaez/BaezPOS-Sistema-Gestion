package com.baez.baezpos.security.service;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.security.JwtService;
import com.baez.baezpos.security.dto.AuthenticationRequest;
import com.baez.baezpos.security.dto.AuthenticationResponse;
import com.baez.baezpos.user.entity.User;
import com.baez.baezpos.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthenticationResponse authenticate(AuthenticationRequest request) {

        // 1. Buscamos al usuario para validar su estado ANTES de la contraseña
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("Usuario o contraseña incorrectos"));

        // 2. FILTRO DE ALEXANDER (Validación de bloqueo y suscripción)
        if (user.getRole() != null && !user.getRole().name().equals("SUPER_ADMIN")) {

            // A) Usuario desactivado manualmente
            if (Boolean.FALSE.equals(user.getActive())) {
                throw new DisabledException("CUENTA_SUSPENDIDA");
            }

            Company company = user.getCompany();
            if (company == null) {
                throw new RuntimeException("EMPRESA_NO_EXISTE");
            }

            // B) Empresa desactivada manualmente
            if (Boolean.FALSE.equals(company.getActive())) {
                throw new DisabledException("CUENTA_SUSPENDIDA");
            }

            // C) Suscripción vencida por fecha
            LocalDate hoy = LocalDate.now();
            if (company.getExpirationDate() != null && company.getExpirationDate().isBefore(hoy)) {
                throw new DisabledException("SUSCRIPCION_VENCIDA");
            }
        }

        // 3. Si pasó los filtros, validamos la contraseña con Spring
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
        } catch (AuthenticationException e) {
            throw new RuntimeException("Usuario o contraseña incorrectos");
        }

        // 4. Generación de Token
        // En tu AuthService.java, asegúrate de que el paso 4 sea así:
        String jwtToken = jwtService.generateToken(user); // Ya mete el companyId adentro

        return AuthenticationResponse.builder()
                .token(jwtToken)
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole().name())
                // Aquí enviamos el ID real de la DB (ej: 1001)
                .companyId(user.getCompany() != null ? user.getCompany().getId() : 0L)
                .build();
    }
}