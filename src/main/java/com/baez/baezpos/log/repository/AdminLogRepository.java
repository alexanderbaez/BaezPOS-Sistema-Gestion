package com.baez.baezpos.log.repository;

import com.baez.baezpos.log.entity.AdminLog;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AdminLogRepository extends JpaRepository<AdminLog, Long> {
    List<AdminLog> findAllByOrderByTimestampDesc(); // Los más nuevos primero
}
