package com.baez.baezpos.user.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class MasterRegistrationRequest {
    // Datos de la Empresa
    private String companyName;
    private String taxId;
    private LocalDate expirationDate; // Si viene null, ya programamos que le dé 15 días

    // Datos del Dueño
    private String ownerName;
    private String ownerEmail;
    private String ownerPassword;
}
