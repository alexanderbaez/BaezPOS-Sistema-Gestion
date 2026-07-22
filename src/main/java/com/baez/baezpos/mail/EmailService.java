package com.baez.baezpos.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j // Usamos log de Slf4j en lugar de System.out
public class EmailService {

    private final JavaMailSender mailSender;

    public void enviarCorreoPro(String destinatario, String asunto, String contenidoHtml) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // Multipart = true permite renderizar el HTML del ticket o reporte
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(contenidoHtml, true);

            mailSender.send(message);
            log.info("LOCAL: Email enviado con éxito a: {}", destinatario);

        } catch (MessagingException e) {
            log.error("LOCAL ERROR: No se pudo enviar el email a {}. Detalle: {}", destinatario, e.getMessage());
            throw new RuntimeException("Error enviando email: " + e.getMessage());
        }
    }
}