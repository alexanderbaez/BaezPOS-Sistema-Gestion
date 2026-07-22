package com.baez.baezpos.inventory.service.InventoryServiceImpl;

import com.baez.baezpos.inventory.entity.InventoryMovement;
import com.baez.baezpos.inventory.entity.MovementType;
import com.baez.baezpos.inventory.repository.InventoryRepository;
import com.baez.baezpos.inventory.service.InventoryService.InventoryService;
import com.baez.baezpos.product.entity.Product;
import com.baez.baezpos.product.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class InventoryServiceImpl implements InventoryService {

    private final InventoryRepository inventoryRepository;
    private final ProductRepository productRepository;

    @Override
    @Transactional
    public InventoryMovement registerMovement(Long productId, Integer quantity, MovementType type, String reason) {
        // 1. Validar que el producto existe (Ya no filtramos por empresa)
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado."));

        // 2. Lógica de Stock
        if (isNegativeMovement(type)) {
            if (product.getStock() < quantity) {
                throw new RuntimeException("Stock insuficiente. Actual: " + product.getStock());
            }
            product.setStock(product.getStock() - quantity);
        } else {
            product.setStock(product.getStock() + quantity);
        }

        productRepository.save(product);

        // 3. Registrar movimiento
        InventoryMovement movement = InventoryMovement.builder()
                .movementType(type)
                .quantity(quantity)
                .reason(reason)
                .product(product)
                .build();

        log.info("LOCAL: Movimiento {} registrado para: {}", type, product.getName());
        return inventoryRepository.save(movement);
    }

    private boolean isNegativeMovement(MovementType type) {
        return switch (type) {
            case SALE, DAMAGE, ADJUSTMENT_OUT -> true;
            case PURCHASE, ADJUSTMENT_IN, RETURN -> false;
        };
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryMovement> getProductMovements(Long productId) {
        return inventoryRepository.findByProductIdOrderByCreatedAtDesc(productId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryMovement> getAllRecentMovements() {
        return inventoryRepository.findAllByOrderByCreatedAtDesc();
    }
}