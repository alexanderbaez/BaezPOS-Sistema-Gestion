package com.baez.baezpos.user.service.UserServiceImpl;

import com.baez.baezpos.user.dto.UserResponseDTO;
import com.baez.baezpos.user.entity.User;
import com.baez.baezpos.user.repository.UserRepository;
import com.baez.baezpos.user.service.UserService.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserServiceImpl implements UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public UserResponseDTO createUser(User user) {
        if (userRepository.existsByEmail(user.getEmail())) {
            throw new RuntimeException("El email '" + user.getEmail() + "' ya existe.");
        }
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActive(true);
        log.info("LOCAL: Registrando nuevo usuario: {}", user.getEmail());
        return convertToDTO(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUserById(Long id) {
        return userRepository.findById(id)
                .map(this::convertToDTO)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public UserResponseDTO updateUser(Long id, User details) {
        User existing = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        existing.setName(details.getName());
        existing.setRole(details.getRole());
        existing.setEmail(details.getEmail());

        // CORRECCIÓN: Si el objeto que viene del frontend trae password, se encripta y guarda
        if (details.getPassword() != null && !details.getPassword().isEmpty()) {
            existing.setPassword(passwordEncoder.encode(details.getPassword()));
        }

        return convertToDTO(userRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) throw new RuntimeException("Usuario no existe.");
        userRepository.deleteById(id);
        log.warn("Usuario eliminado ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        // En modo local, la entidad User ya implementa UserDetails, la devolvemos directo
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));
    }

    private UserResponseDTO convertToDTO(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .build();
    }

    @Override
    @Transactional
    public void updatePasswordOnly(String email, String newPassword) {
        User user = userRepository.findByEmail(email).get();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordResetAt(null); // <--- Limpiamos el reloj porque ya puso su clave real
        userRepository.save(user);
    }
}