package com.baez.baezpos.security.util;

import com.baez.baezpos.security.entity.UserPrincipal;
import com.baez.baezpos.user.entity.User;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class SecurityUtils {

    /**
     * Obtiene el email del usuario autenticado desde el SecurityContext.
     */
    public static String getCurrentUserEmail() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }
        return authentication.getName();
    }

    /**
     * Nota de Arquitecto:
     * Para obtener el CompanyID de forma eficiente sin ir a la DB en cada click,
     * lo ideal es extraerlo de los Claims del JWT que guardamos en el AuthToken.
     */
    public static Long getCurrentCompanyId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getCompanyId();
        }
        return null;
    }

    // En com.baez.baezpos.security.util.SecurityUtils
    public static Long getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof UserPrincipal principal) {
            return principal.getId(); // El ID del usuario que guardamos en el UserPrincipal
        }
        return null;
    }
}