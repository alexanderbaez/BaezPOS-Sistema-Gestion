package com.baez.baezpos.security.config;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.company.repository.CompanyRepository;
import com.baez.baezpos.user.entity.User;
import com.baez.baezpos.user.entity.Role;
import com.baez.baezpos.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        // 1. Verificamos si ya hay datos para no duplicar
        if (companyRepository.count() == 0) {
            Company mainCompany = Company.builder()
                    .name("Baez Distribuidora")
                    .taxId("20-12345678-9") // Agregamos esto
                    .address("Calle Falsa 123") // Agregamos esto para evitar el próximo error
                    .phone("2641234567")       // Agregamos esto
                    .active(true)
                    .build();

            // Seteamos las fechas manualmente (lo que hicimos recién)
            mainCompany.setCreatedAt(LocalDateTime.now());
            mainCompany.setUpdatedAt(LocalDateTime.now());

            companyRepository.save(mainCompany);

            // 3. Creamos el Usuario Admin asociado a esa empresa
            User admin = User.builder()
                    .name("Alexander Admin")
                    .email("admin@baezpos.com")
                    // IMPORTANTE: Encriptamos la clave para que BCrypt no de 403
                    .password(passwordEncoder.encode("admin123"))
                    .role(Role.ADMIN)
                    .active(true)
                    .company(mainCompany)
                    .build();

            userRepository.save(admin);

            System.out.println("--------------------------------------------------");
            System.out.println(">>> SEEDER: Datos de prueba creados con éxito");
            System.out.println(">>> Login: admin@baezpos.com / admin123");
            System.out.println("--------------------------------------------------");
        }
    }
}