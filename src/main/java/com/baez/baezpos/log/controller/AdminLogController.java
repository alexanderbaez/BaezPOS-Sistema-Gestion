package com.baez.baezpos.log.controller;

import com.baez.baezpos.log.entity.SystemLog;
import com.baez.baezpos.log.repository.SystemLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/logs")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminLogController {

    private final SystemLogRepository logRepository;

    @GetMapping
    public ResponseEntity<List<SystemLog>> getLogs() {
        // En local, el dueño ve todo lo que pasó en su sistema
        return ResponseEntity.ok(logRepository.findTop100ByOrderByTimestampDesc());
    }
}