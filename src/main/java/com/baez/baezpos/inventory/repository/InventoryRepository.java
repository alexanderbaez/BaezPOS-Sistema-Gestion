package com.baez.baezpos.inventory.repository;

import com.baez.baezpos.inventory.entity.InventoryMovement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface InventoryRepository extends JpaRepository<InventoryMovement, Long> {
    List<InventoryMovement> findByProductId(Long productId);
    List<InventoryMovement> findByCompanyIdOrderByCreatedAtDesc(Long companyId);
}