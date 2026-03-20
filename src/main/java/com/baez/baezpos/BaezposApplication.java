package com.baez.baezpos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

@SpringBootApplication
@EnableJpaAuditing
public class BaezposApplication {

	public static void main(String[] args) {
		SpringApplication.run(BaezposApplication.class, args);
	}

}
