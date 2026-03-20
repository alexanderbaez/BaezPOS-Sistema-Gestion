package com.baez.baezpos.user.service.UserService;

import com.baez.baezpos.user.dto.UserResponseDTO;
import com.baez.baezpos.user.entity.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import java.util.List;

public interface UserService extends UserDetailsService {
    UserResponseDTO createUser(User user); // Recibe Entity (con pass), devuelve DTO (seguro)
    UserResponseDTO getUserById(Long id);
    List<UserResponseDTO> getAllByCompany(Long companyId);
    UserResponseDTO updateUser(Long id, User user);
    void deleteUser(Long id);
}