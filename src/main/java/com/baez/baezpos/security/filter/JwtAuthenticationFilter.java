package com.baez.baezpos.security.filter;

import com.baez.baezpos.security.JwtService;
import com.baez.baezpos.security.entity.UserPrincipal;
import com.baez.baezpos.security.service.CustomUserDetailsService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain
    ) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        try {
            final String userEmail = jwtService.extractUsername(jwt);

            if (userEmail != null && SecurityContextHolder.getContext().getAuthentication() == null) {

                // 1. CARGA SEGURA: Cargamos como UserDetails primero
                UserDetails userDetails = this.userDetailsService.loadUserByUsername(userEmail);

                // 2. VALIDACIÓN: Si es nuestro UserPrincipal, seguimos
                if (userDetails instanceof UserPrincipal userPrincipal) {

                    if (jwtService.isTokenValid(jwt, userPrincipal.getUsername())) {

                        // Extraemos roles del JWT
                        List<String> roles = jwtService.extractClaim(jwt, claims ->
                                (List<String>) claims.get("authorities"));

                        // Verificación de cuenta activa (excepto SuperAdmin)
                        boolean isSuperAdmin = roles != null && roles.contains("ROLE_SUPER_ADMIN");
                        if (!isSuperAdmin && !userPrincipal.isEnabled()) {
                            response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"error\": \"CUENTA_SUSPENDIDA\"}");
                            return;
                        }

                        var authorities = roles.stream()
                                .map(SimpleGrantedAuthority::new)
                                .collect(Collectors.toList());

                        // 3. CREACIÓN DEL TOKEN: Usamos userPrincipal (el objeto completo)
                        UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                                userPrincipal,
                                null,
                                authorities
                        );

                        authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authToken);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error en JwtFilter: " + e.getMessage());
        }
        filterChain.doFilter(request, response);
    }
}