package com.baez.baezpos.security.config;


import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;


    @Component
    @RequiredArgsConstructor
    public class DataInitializer implements CommandLineRunner {
        // Dejá las inyecciones si querés, pero el método run debe quedar vacío:
        @Override
        @Transactional
        public void run(String... args) throws Exception {
            // YA NO HAY NADA ESTÁTICO AQUÍ.
            // El sistema arrancará con lo que encuentre en MySQL.
        }
    }
