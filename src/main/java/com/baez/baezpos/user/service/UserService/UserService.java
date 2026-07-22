package com.baez.baezpos.user.service.UserService;

import com.baez.baezpos.user.dto.UserResponseDTO;
import com.baez.baezpos.user.entity.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import java.util.List;

public interface UserService extends UserDetailsService {
    UserResponseDTO createUser(User user);
    UserResponseDTO getUserById(Long id);
    List<UserResponseDTO> getAllUsers(); // Limpio de companyId
    UserResponseDTO updateUser(Long id, User user);
    void deleteUser(Long id);
    // En UserService.java
    void updatePasswordOnly(String email, String newPassword);
}