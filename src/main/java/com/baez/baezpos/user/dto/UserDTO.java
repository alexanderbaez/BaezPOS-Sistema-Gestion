package com.baez.baezpos.user.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class UserDTO {
    private Long id;
    private String name;
    private String email;
    private String password; // Solo se usa al crear o resetear
    private String role;     // "CASHIER" o "ADMIN"
    private Boolean active;
}