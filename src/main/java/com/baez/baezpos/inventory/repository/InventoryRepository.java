package com.baez.baezpos.inventory.repository;

import com.baez.baezpos.inventory.entity.InventoryMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface InventoryRepository extends JpaRepository<InventoryMovement, Long> {
    List<InventoryMovement> findByProductIdOrderByCreatedAtDesc(Long productId);

    // Cambiado: Ya no filtra por CompanyId
    List<InventoryMovement> findAllByOrderByCreatedAtDesc();
}