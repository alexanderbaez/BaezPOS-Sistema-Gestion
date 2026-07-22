package com.baez.baezpos.inventory.service.InventoryService;

import com.baez.baezpos.inventory.entity.InventoryMovement;
import com.baez.baezpos.inventory.entity.MovementType;
import java.util.List;

public interface InventoryService {
    // Quitamos companyId de todas las firmas
    InventoryMovement registerMovement(Long productId, Integer quantity, MovementType type, String reason);
    List<InventoryMovement> getProductMovements(Long productId);
    List<InventoryMovement> getAllRecentMovements();
}