package com.baez.baezpos.security.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class SetupRequest {
    
    // User details
    private String userName;
    private String email;
    private String password;
    
    // Company details
    private String companyName;
    private String taxId;       // RUT / CUIT / ID Fiscal
    private String phone;
    private String address;
    private String ticketMessage;
}
