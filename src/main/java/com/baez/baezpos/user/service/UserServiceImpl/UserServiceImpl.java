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
            throw new RuntimeException("El email '" + user.getEmail() + "' ya está registrado.");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setActive(true);

        log.info("SaaS: Registrando usuario {} para empresa ID: {}", user.getEmail(), user.getCompany().getId());
        return convertToDTO(userRepository.save(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponseDTO getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado con ID: " + id));
        return convertToDTO(user);
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllByCompany(Long companyId) {
        return userRepository.findAllByCompanyId(companyId)
                .stream()
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

        if (!existing.getEmail().equals(details.getEmail()) && userRepository.existsByEmail(details.getEmail())) {
            throw new RuntimeException("El nuevo email ya está en uso.");
        }
        existing.setEmail(details.getEmail());

        return convertToDTO(userRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) throw new RuntimeException("Usuario no existe.");
        userRepository.deleteById(id);
        log.warn("Usuario eliminado (Soft Delete) ID: {}", id);
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) throws UsernameNotFoundException {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new UsernameNotFoundException("Usuario no encontrado: " + email));

        if (!user.getCompany().getActive()) {
            throw new RuntimeException("Empresa inactiva o suscripción vencida.");
        }

        return org.springframework.security.core.userdetails.User.builder()
                .username(user.getEmail())
                .password(user.getPassword())
                .authorities(user.getRole().name())
                .disabled(!user.getActive())
                .build();
    }

    // MAPPER MANUAL (Sin librerías externas para mantenerlo simple)
    private UserResponseDTO convertToDTO(User user) {
        return UserResponseDTO.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .companyId(user.getCompany().getId())
                .companyName(user.getCompany().getName())
                .build();
    }
}