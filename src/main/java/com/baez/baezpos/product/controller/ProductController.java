package com.baez.baezpos.product.controller;

import com.baez.baezpos.product.dto.ProductRequestDTO;
import com.baez.baezpos.product.dto.ProductResponseDTO;
import com.baez.baezpos.product.service.service.ProductService;
import com.baez.baezpos.security.entity.UserPrincipal;
import com.baez.baezpos.security.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:63342")
public class ProductController {

    private final ProductService productService;

    private Long getTenantId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserPrincipal user) {
            return user.getCompanyId();
        }
        throw new RuntimeException("Error de autenticación: Tenant no encontrado");
    }

    @PostMapping
    public ResponseEntity<ProductResponseDTO> create(@RequestBody ProductRequestDTO dto) {
        // ¡Mucho más limpio! Usamos la utilidad que ya conoce al UserPrincipal
        return new ResponseEntity<>(productService.createProduct(dto, SecurityUtils.getCurrentCompanyId()), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<ProductResponseDTO>> getAll() {
        return ResponseEntity.ok(productService.getAllProducts(getTenantId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ProductResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(productService.getProductById(id, getTenantId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ProductResponseDTO> update(@PathVariable Long id, @RequestBody ProductRequestDTO dto) {
        return ResponseEntity.ok(productService.updateProduct(id, dto, getTenantId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        productService.deleteProduct(id, getTenantId());
        return ResponseEntity.noContent().build();
    }

    // ProductController.java

    @GetMapping("/deleted")
    public ResponseEntity<List<ProductResponseDTO>> getDeleted() {
        return ResponseEntity.ok(productService.getDeletedProducts(getTenantId()));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<ProductResponseDTO> activate(@PathVariable Long id) {
        return ResponseEntity.ok(productService.activateProduct(id, getTenantId()));
    }
}