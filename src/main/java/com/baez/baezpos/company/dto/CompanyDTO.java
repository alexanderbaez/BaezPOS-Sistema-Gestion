package com.baez.baezpos.company.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
@Data
@Builder // <--- AGREGA ESTA LÍNEA
@AllArgsConstructor
@NoArgsConstructor
public class CompanyDTO {
    private Long id;
    private String name;
    private String taxId;
    private String address;
    private String phone;
    private String email;
    private String ownerPassword;
    private LocalDate expirationDate;
    private Boolean active;

    // --- AGREGAR ESTOS CAMPOS PARA QUE NO DE ERROR EL MAPPER ---
    private String ticketMessage;
    private String logoUrl;
}