package com.baez.baezpos.security.entity;

import com.baez.baezpos.user.entity.User;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.Collections;

@Getter
@AllArgsConstructor
public class UserPrincipal implements UserDetails {
    private Long id;
    private String email;
    private String password;
    private Long companyId;
    private boolean enabled; // <--- 1. AGREGAMOS ESTO
    private Collection<? extends GrantedAuthority> authorities;

    public static UserPrincipal create(User user) {
        // Manejo de seguridad por si es Alexander (Super Admin no tiene empresa)
        Long compId = (user.getCompany() != null) ? user.getCompany().getId() : null;

        return new UserPrincipal(
                user.getId(),
                user.getEmail(),
                user.getPassword(),
                compId,
                user.getActive(), // <--- 2. PASAMOS EL ESTADO REAL AQUÍ
                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()))
        );
    }


    @Override
    public String getUsername() { return email; }
    @Override
    public String getPassword() { return password; }
    @Override
    public boolean isAccountNonExpired() { return true; }
    @Override
    public boolean isAccountNonLocked() { return true; }
    @Override
    public boolean isCredentialsNonExpired() { return true; }
    @Override
    public boolean isEnabled() {
        return enabled; // <--- 3. AHORA DEVUELVE EL VALOR REAL DE LA DB
    }
}