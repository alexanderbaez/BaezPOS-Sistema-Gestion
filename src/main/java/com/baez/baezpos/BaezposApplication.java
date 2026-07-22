package com.baez.baezpos;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.io.IOException;

@SpringBootApplication
@EnableJpaAuditing
public class BaezposApplication {

	public static void main(String[] args) {
		SpringApplication.run(BaezposApplication.class, args);
		// Lanzamos la interfaz en modo app nativa local
		abrirModoApp("http://localhost:8080");

		// Cambiá "tu_clave_secreta" por la que vos quieras usar para entrar
		System.out.println("COPIA ESTE HASH: " + new BCryptPasswordEncoder().encode("Alexander.38216639"));

		String miPC = com.baez.baezpos.util.HardwareIdentificador.getSerialNumber();
		String miLlave = com.baez.baezpos.util.HardwareIdentificador.generarLlaveMaestra(miPC);

		System.out.println("==========================================");
		System.out.println("ID DE PC: " + miPC);
		System.out.println("TU LLAVE MAESTRA DE HOY ES: " + miLlave);
		System.out.println("==========================================");
	}
	private static void abrirModoApp(String url) {
		String os = System.getProperty("os.name").toLowerCase();

		if (os.contains("win")) {
			try {
				// Intenta abrir con Chrome en modo aplicación (sin barras ni pestañas)
				new ProcessBuilder("cmd", "/c", "start chrome --app=" + url).start();
			} catch (IOException e1) {
				try {
					// Si el cliente no tiene Chrome, intenta con Edge en el mismo modo
					new ProcessBuilder("cmd", "/c", "start msedge --app=" + url).start();
				} catch (IOException e2) {
					System.err.println("No se pudo abrir un navegador compatible en modo App.");
				}
			}
		} else {
			// Soporte genérico por si lo corren en Linux (ej. antiX)
			try {
				new ProcessBuilder("xdg-open", url).start();
			} catch (IOException e) {
				System.err.println("Error abriendo navegador en sistema No-Windows.");
			}
		}
	}


}
