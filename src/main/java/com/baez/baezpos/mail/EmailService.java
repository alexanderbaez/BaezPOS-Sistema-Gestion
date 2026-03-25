package com.baez.baezpos.mail;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    public void enviarCorreoPro(String destinatario, String asunto, String contenidoHtml) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            // El 'true' en el constructor indica que es un mensaje "multipart" (permite HTML)
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(destinatario);
            helper.setSubject(asunto);
            helper.setText(contenidoHtml, true);

            mailSender.send(message);
            System.out.println("Email enviado con éxito a: " + destinatario);
        } catch (MessagingException e) {
            System.err.println("Error al enviar email: " + e.getMessage());
            throw new RuntimeException("Error enviando email: " + e.getMessage());
        }
    }
}