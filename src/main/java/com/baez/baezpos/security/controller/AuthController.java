package com.baez.baezpos.security.controller;

import com.baez.baezpos.security.dto.AuthenticationRequest;
import com.baez.baezpos.security.dto.AuthenticationResponse;
import com.baez.baezpos.security.dto.SetupRequest;
import com.baez.baezpos.security.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AuthController {

    private final AuthService authService;

    @PostMapping("/authenticate")
    public ResponseEntity<AuthenticationResponse> authenticate(
            @RequestBody AuthenticationRequest request
    ) {
        return ResponseEntity.ok(authService.authenticate(request));
    }

    @GetMapping("/setup-status")
    public ResponseEntity<java.util.Map<String, Boolean>> getSetupStatus() {
        return ResponseEntity.ok(authService.getSetupStatus());
    }

    @PostMapping("/setup")
    public ResponseEntity<AuthenticationResponse> setup(
            @RequestBody SetupRequest request
    ) {
        return ResponseEntity.ok(authService.setup(request));
    }

    @GetMapping("/pc-id")
    public ResponseEntity<?> getPcId() {
        return ResponseEntity.ok(java.util.Map.of("pcId", com.baez.baezpos.util.HardwareIdentificador.getSerialNumber()));
    }

    @PostMapping("/validar-llave-maestra")
    public ResponseEntity<?> validarLlave(@RequestBody java.util.Map<String, String> request) {
        String llave = request.get("llave");
        try {
            authService.validarYResetearAdmin(llave);
            return ResponseEntity.ok(java.util.Map.of("message", "Acceso restaurado correctamente."));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(java.util.Map.of("message", e.getMessage()));
        }
    }
}