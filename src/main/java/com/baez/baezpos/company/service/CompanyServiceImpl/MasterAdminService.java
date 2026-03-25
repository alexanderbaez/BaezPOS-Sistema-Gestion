package com.baez.baezpos.company.service.CompanyServiceImpl;

import com.baez.baezpos.company.dto.CompanyDTO;
import com.baez.baezpos.company.dto.MasterRegistrationRequest;
import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.company.repository.CompanyRepository;
import com.baez.baezpos.company.service.CompanyService.MasterADmin;
import com.baez.baezpos.log.entity.AdminLog;
import com.baez.baezpos.log.repository.AdminLogRepository;
import com.baez.baezpos.user.entity.User;
import com.baez.baezpos.user.entity.Role;
import com.baez.baezpos.user.repository.UserRepository;
import com.baez.baezpos.mail.EmailService;
import com.baez.baezpos.shared.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class MasterAdminService implements MasterADmin {

    private final CompanyRepository companyRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminLogRepository logRepository;
    private final EmailService emailService;

    // --- LÓGICA DE EMAILS PROFESIONALES (Diseño Moderno) ---
    private String generarPlantilla(String titulo, String contenido) {
        return """
        <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: #1a202c; color: #ffffff; padding: 30px; text-align: center;">
                <h1 style="margin: 0; font-size: 24px; letter-spacing: 2px;">BÁEZ POS</h1>
                <p style="margin: 5px 0 0 0; color: #a0aec0; font-size: 14px;">Gestión de Puntos de Venta</p>
            </div>
            <div style="padding: 40px; background: #ffffff; color: #2d3748;">
                <h3 style="color: #1a202c; border-bottom: 2px solid #edf2f7; padding-bottom: 15px; margin-top: 0;">%s</h3>
                <div style="line-height: 1.6; font-size: 16px;">
                    %s
                </div>
                <p style="margin-top: 30px; font-size: 14px; color: #718096;">Si tiene alguna duda, puede contactar a soporte técnico directamente.</p>
            </div>
            <div style="background: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #718096; border-top: 1px solid #edf2f7;">
                <p style="margin: 0;">&copy; 2026 BÁEZ POS - San Juan, Argentina</p>
                <p style="margin: 5px 0 0 0;"><strong>Soporte Alexander:</strong> +54 9 264 546-8570</p>
            </div>
        </div>
        """.formatted(titulo, contenido);
    }

    @Override
    @Transactional
    public void registerFullBusiness(MasterRegistrationRequest req) {
        if (companyRepository.existsByTaxId(req.getTaxId())) throw new RuntimeException("TaxId ya existe");

        Company company = companyRepository.save(Company.builder()
                .name(req.getCompanyName()).taxId(req.getTaxId()).address(req.getAddress())
                .phone(req.getPhone()).email(req.getOwnerEmail())
                .expirationDate(req.getExpirationDate() != null ? req.getExpirationDate() : LocalDate.now().plusDays(15))
                .active(true).ticketMessage(req.getTicketMessage()).build());

        userRepository.save(User.builder()
                .name(req.getOwnerName()).email(req.getOwnerEmail())
                .password(passwordEncoder.encode(req.getOwnerPassword()))
                .role(Role.ADMIN).company(company).active(true).build());

        String cuerpo = """
            <p>Estimado/a <strong>%s</strong>,</p>
            <p>Nos complace informarle que su empresa <strong>%s</strong> ha sido dada de alta correctamente en nuestra plataforma.</p>
            <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 20px; margin: 20px 0;">
                <p style="margin: 0; color: #0369a1;"><strong>Sus credenciales de acceso:</strong></p>
                <p style="margin: 10px 0 5px 0;">Usuario: <code>%s</code></p>
                <p style="margin: 0;">Contraseña: <code>%s</code></p>
            </div>
            <p>Puede ingresar al panel administrativo para configurar sus productos y comenzar a vender.</p>
        """.formatted(req.getOwnerName(), req.getCompanyName(), req.getOwnerEmail(), req.getOwnerPassword());

        emailService.enviarCorreoPro(req.getOwnerEmail(), "🚀 ¡Bienvenido a BÁEZ POS!", generarPlantilla("Activación de Cuenta", cuerpo));
    }

    @Override
    @Transactional
    public void updateCompanyMaster(Long id, CompanyDTO dto) {
        // 1. Buscamos la empresa
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("No se encontró la empresa con ID: " + id));

        // Guardamos el estado anterior para saber si hubo cambios importantes
        boolean estabaInactiva = !company.getActive();
        LocalDate vencimientoAnterior = company.getExpirationDate();

        // 2. Actualizamos los campos
        company.setName(dto.getName());
        company.setTaxId(dto.getTaxId());
        company.setAddress(dto.getAddress());
        company.setPhone(dto.getPhone());
        company.setExpirationDate(dto.getExpirationDate());
        company.setActive(dto.getActive());
        company.setTicketMessage(dto.getTicketMessage());

        companyRepository.save(company);

        // 3. Sincronizamos al Dueño (ADMIN)
        userRepository.findByCompanyIdAndRole(id, Role.ADMIN).ifPresent(owner -> {
            owner.setActive(dto.getActive());
            userRepository.save(owner);

            // --- ENVÍO DE CORREO DE NOTIFICACIÓN ---
            // Solo enviamos correo si Alexander activó la cuenta o cambió la fecha de vencimiento
            if ((estabaInactiva && dto.getActive()) || !dto.getExpirationDate().equals(vencimientoAnterior)) {

                String estadoTexto = dto.getActive() ? "ACTIVA" : "SUSPENDIDA";

                String cuerpo = """
                <p>Hola <strong>%s</strong>,</p>
                <p>Se han realizado actualizaciones administrativas en tu cuenta de <strong>%s</strong>.</p>
                <div style="background: #f8fafc; border: 1px solid #e2e8f0; padding: 20px; margin: 20px 0; border-radius: 8px;">
                    <p style="margin: 0; color: #1e293b;"><strong>Resumen de tu suscripción:</strong></p>
                    <p style="margin: 10px 0 5px 0;">Estado: <span style="color: %s; font-weight: bold;">%s</span></p>
                    <p style="margin: 0;">Nueva fecha de vencimiento: <strong>%s</strong></p>
                </div>
                <p>Si tu cuenta estaba suspendida, ya puedes ingresar nuevamente al sistema.</p>
                <p style="color: #64748b; font-size: 0.9em;">Atentamente, Soporte Técnico Báez POS.</p>
            """.formatted(
                        owner.getName(),
                        company.getName(),
                        dto.getActive() ? "#10b981" : "#ef4444",
                        estadoTexto,
                        dto.getExpirationDate().toString()
                );

                emailService.enviarCorreoPro(
                        owner.getEmail(),
                        "🔄 Actualización de suscripción - " + company.getName(),
                        generarPlantilla("Actualización de Cuenta", cuerpo)
                );
            }
        });
    }

    @Override
    @Transactional
    public void resetOwnerPassword(Long companyId, String newRawPassword) {
        User owner = userRepository.findByCompanyIdAndRole(companyId, Role.ADMIN).orElseThrow();
        owner.setPassword(passwordEncoder.encode(newRawPassword));
        userRepository.save(owner);

        String cuerpo = """
            <p>Hola <strong>%s</strong>,</p>
            <p>Se ha restablecido la contraseña de administrador para su comercio por parte de nuestro equipo de soporte.</p>
            <div style="background: #fff7ed; border-left: 4px solid #f97316; padding: 20px; margin: 20px 0; text-align: center;">
                <p style="margin: 0; color: #9a3412; font-size: 14px;">NUEVA CONTRASEÑA TEMPORAL</p>
                <p style="margin: 10px 0 0 0; font-size: 24px; font-family: monospace; font-weight: bold; letter-spacing: 2px;">%s</p>
            </div>
            <p>Le recomendamos cambiar esta contraseña inmediatamente después de ingresar.</p>
        """.formatted(owner.getName(), newRawPassword);

        emailService.enviarCorreoPro(owner.getEmail(), "🔐 Seguridad: Restablecimiento de Contraseña", generarPlantilla("Nueva Credencial", cuerpo));
    }

    @Override
    @Transactional(readOnly = true)
    public List<CompanyDTO> getAllCompaniesMaster() {
        return companyRepository.findAll().stream()
                .map(this::convertToDTOMaster)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteCompanyMaster(Long id) {
        Company company = companyRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("No existe"));
        logRepository.save(AdminLog.builder()
                .action("DELETE_MASTER").description("Alexander borró: " + company.getName())
                .adminUser("Alexander Master").timestamp(LocalDateTime.now()).build());
        companyRepository.delete(company);
    }

    @Override
    public Map<String, Object> getMasterDashboardStats() {
        Map<String, Object> stats = new HashMap<>();
        stats.put("totalCompanies", companyRepository.count());
        stats.put("activeCompanies", companyRepository.findAll().stream().filter(Company::getActive).count());
        return stats;
    }

    @Override
    @Transactional
    public void extendSubscriptionMaster(Long id) {
        // 1. Buscamos la empresa
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        LocalDate hoy = LocalDate.now();
        LocalDate nuevaFecha;

        // 2. Calculamos la nueva fecha
        // Si la fecha actual de la empresa es nula o ya pasó, sumamos desde hoy
        if (company.getExpirationDate() == null || company.getExpirationDate().isBefore(hoy)) {
            nuevaFecha = hoy.plusDays(30);
        } else {
            // Si todavía tiene días, le sumamos 30 a los que ya tiene
            nuevaFecha = company.getExpirationDate().plusDays(30);
        }

        company.setExpirationDate(nuevaFecha);
        company.setActive(true); // Por las dudas, si estaba suspendida la activamos
        companyRepository.save(company);

        // 3. (Opcional) Enviar mail avisando la extensión
        userRepository.findByCompanyIdAndRole(id, Role.ADMIN).ifPresent(owner -> {
            String cuerpo = """
            <p>¡Hola <strong>%s</strong>!</p>
            <p>Tu suscripción en <strong>BÁEZ POS</strong> ha sido extendida con éxito.</p>
            <p>Nueva fecha de vencimiento: <strong>%s</strong></p>
            <p>Ya puedes seguir operando con normalidad.</p>
        """.formatted(owner.getName(), nuevaFecha.toString());

            emailService.enviarCorreoPro(owner.getEmail(), "✅ Suscripción Extendida - " + company.getName(), generarPlantilla("Abono Extendido", cuerpo));
        });
    }

    private CompanyDTO convertToDTOMaster(Company c) {
        return CompanyDTO.builder().id(c.getId()).name(c.getName()).taxId(c.getTaxId())
                .email(c.getEmail()).expirationDate(c.getExpirationDate()).active(c.getActive()).build();
    }


}