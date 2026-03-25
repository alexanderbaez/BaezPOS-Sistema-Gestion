package com.baez.baezpos.security.util;

import com.baez.baezpos.security.entity.UserPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    /**
     * Extrae el email del usuario autenticado.
     */
    public static String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated() || "anonymousUser".equals(authentication.getPrincipal())) {
            return null;
        }
        return authentication.getName();
    }

    /**
     * Extrae el ID de la empresa del Principal almacenado en el contexto.
     * Este es el corazón de tu sistema Multitenant.
     */
    public static Long getCurrentCompanyId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Validamos que exista la autenticación y que el Principal sea del tipo correcto
        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getCompanyId();
        }

        // Si llega aquí, es porque no hay sesión o el token no tiene empresa
        return null;
    }

    /**
     * Extrae el ID único del usuario (no de la empresa).
     */
    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth != null && auth.isAuthenticated() && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId();
        }
        return null;
    }
}