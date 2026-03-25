package com.baez.baezpos.log.controller;

import com.baez.baezpos.log.entity.AdminLog;
import com.baez.baezpos.log.repository.AdminLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/superadmin/logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminLogController {

    private final AdminLogRepository logRepository;

    @GetMapping
    //@PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<AdminLog>> getLogs() {
        // Retornamos los últimos logs (puedes limitar a los últimos 50 si quieres)
        return ResponseEntity.ok(logRepository.findAllByOrderByTimestampDesc());
    }
}