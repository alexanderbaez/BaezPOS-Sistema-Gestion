package com.baez.baezpos.inventory.controller;

import com.baez.baezpos.inventory.dto.InventoryMovementRequest;
import com.baez.baezpos.inventory.entity.InventoryMovement;
import com.baez.baezpos.inventory.service.InventoryService.InventoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/inventory")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class InventoryController {

    private final InventoryService inventoryService;

    @PostMapping("/movement")
    public ResponseEntity<InventoryMovement> register(@RequestBody InventoryMovementRequest request) {
        InventoryMovement movement = inventoryService.registerMovement(
                request.getProductId(),
                request.getQuantity(),
                request.getType(),
                request.getReason()
        );
        return new ResponseEntity<>(movement, HttpStatus.CREATED);
    }

    @GetMapping("/product/{productId}")
    public ResponseEntity<List<InventoryMovement>> getByProduct(@PathVariable Long productId) {
        return ResponseEntity.ok(inventoryService.getProductMovements(productId));
    }

    @GetMapping("/recent")
    public ResponseEntity<List<InventoryMovement>> getRecent() {
        return ResponseEntity.ok(inventoryService.getAllRecentMovements());
    }
}