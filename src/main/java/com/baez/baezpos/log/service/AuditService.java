package com.baez.baezpos.log.service;

import com.baez.baezpos.log.entity.SystemLog;
import com.baez.baezpos.log.repository.SystemLogRepository;
import com.baez.baezpos.security.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {

    private final SystemLogRepository logRepository;

    public void logAction(String action, String description) {
        SystemLog log = SystemLog.builder()
                .action(action)
                .description(description)
                .userEmail(SecurityUtils.getCurrentUserEmail() != null ?
                        SecurityUtils.getCurrentUserEmail() : "SISTEMA")
                .build();
        logRepository.save(log);
    }
}