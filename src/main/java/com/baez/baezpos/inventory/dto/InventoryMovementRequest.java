package com.baez.baezpos.inventory.dto;

import com.baez.baezpos.inventory.entity.MovementType;
import lombok.Data;

// DTO para la petición
@Data
public class InventoryMovementRequest {
    private Long productId;
    private Integer quantity;
    private MovementType type;
    private String reason;
}