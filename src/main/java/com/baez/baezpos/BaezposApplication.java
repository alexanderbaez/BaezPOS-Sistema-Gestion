package com.baez.baezpos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

@SpringBootApplication
@EnableJpaAuditing
public class BaezposApplication {

	public static void main(String[] args) {
		SpringApplication.run(BaezposApplication.class, args);

		// Cambiá "tu_clave_secreta" por la que vos quieras usar para entrar
		System.out.println("COPIA ESTE HASH: " + new BCryptPasswordEncoder().encode("Alexander.38216639"));
	}


}
