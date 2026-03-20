package com.baez.baezpos.company.dto;

import lombok.Data;
import java.time.LocalDate;

@Data
public class CompanyDTO {
    private Long id;
    private String name;
    private String taxId;
    private String address;
    private String phone;
    private String email;
    private String ticketMessage;
    private String logoUrl;
    private LocalDate expirationDate;
    private boolean active;
}