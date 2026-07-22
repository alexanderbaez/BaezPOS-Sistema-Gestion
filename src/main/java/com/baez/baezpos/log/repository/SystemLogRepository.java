package com.baez.baezpos.log.repository;

import com.baez.baezpos.log.entity.SystemLog;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SystemLogRepository extends JpaRepository<SystemLog, Long> {
    // Para no saturar la memoria, traemos los últimos 100 movimientos
    List<SystemLog> findTop100ByOrderByTimestampDesc();
}