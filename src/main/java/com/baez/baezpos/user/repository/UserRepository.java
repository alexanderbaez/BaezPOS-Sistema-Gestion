package com.baez.baezpos.user.repository;

import com.baez.baezpos.user.entity.User;
import com.baez.baezpos.user.entity.Role; // <--- IMPORTANTE: Para que reconozca el Enum
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    // Para ver a todos (Dueño + Silvia + otros cajeros)
    List<User> findAllByCompanyId(Long companyId);

    // --- EL SUPERPODER QUE TE FALTA PARA EL PANEL MAESTRO ---
    // Esto busca al UNICO usuario que sea ADMIN en esa empresa específica
    Optional<User> findByCompanyIdAndRole(Long companyId, Role role);

    boolean existsByEmail(String email);
}