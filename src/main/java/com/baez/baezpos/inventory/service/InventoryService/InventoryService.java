package com.baez.baezpos.inventory.service.InventoryService;

import com.baez.baezpos.inventory.entity.InventoryMovement;
import com.baez.baezpos.inventory.entity.MovementType;

import java.util.List;

public interface InventoryService {
    // Unificamos en un método genérico para mayor flexibilidad
    InventoryMovement registerMovement(Long productId, Integer quantity, MovementType type, String reason, Long companyId);

    List<InventoryMovement> getProductMovements(Long productId, Long companyId);

    List<InventoryMovement> getRecentMovementsByCompany(Long companyId);
}
