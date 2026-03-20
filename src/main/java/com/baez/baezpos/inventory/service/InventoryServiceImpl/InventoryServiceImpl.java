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
    public InventoryMovement registerMovement(Long productId, Integer quantity, MovementType type, String reason, Long companyId) {
        // 1. Validar que el producto existe y pertenece a la empresa
        Product product = productRepository.findById(productId)
                .filter(p -> p.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Producto no encontrado o acceso denegado."));

        // 2. Lógica de Stock según tipo
        if (isNegativeMovement(type)) {
            if (product.getStock() < quantity) {
                throw new RuntimeException("Stock insuficiente para realizar esta operación. Actual: " + product.getStock());
            }
            product.setStock(product.getStock() - quantity); // ANTES ESTABA SUMANDO
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
                .company(product.getCompany()) // Asignamos la empresa del producto
                .build();

        log.info("Movimiento de inventario ({}) registrado para producto: {}", type, productId);
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
    public List<InventoryMovement> getProductMovements(Long productId, Long companyId) {
        // Validamos propiedad antes de devolver lista
        productRepository.findById(productId)
                .filter(p -> p.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Acceso denegado a los movimientos de este producto."));

        return inventoryRepository.findByProductId(productId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<InventoryMovement> getRecentMovementsByCompany(Long companyId) {
        return inventoryRepository.findByCompanyIdOrderByCreatedAtDesc(companyId);
    }
}
