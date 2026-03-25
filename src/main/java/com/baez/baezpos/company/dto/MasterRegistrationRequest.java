package com.baez.baezpos.company.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class MasterRegistrationRequest {
    // --- DATOS DEL COMERCIO ---
    private String companyName;
    private String taxId;
    private String address;
    private String phone;          // <--- AGREGADO: Para contacto rápido
    private String ticketMessage;  // <--- AGREGADO: "Gracias por su compra", etc.
    private LocalDate expirationDate;

    // --- DATOS DEL DUEÑO (ADMIN) ---
    private String ownerName;
    private String ownerEmail;
    private String ownerPassword;
}