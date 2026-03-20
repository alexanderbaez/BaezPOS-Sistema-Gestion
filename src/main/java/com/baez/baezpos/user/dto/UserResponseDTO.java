package com.baez.baezpos.user.dto;

import com.baez.baezpos.user.entity.Role;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserResponseDTO {
    private Long id;
    private String name;
    private String email;
    private Role role;
    private Long companyId;
    private String companyName;
}