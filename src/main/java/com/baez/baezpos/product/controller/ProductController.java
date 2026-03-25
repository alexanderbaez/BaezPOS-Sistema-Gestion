package com.baez.baezpos.product.controller;

import com.baez.baezpos.product.dto.ProductRequestDTO;
import com.baez.baezpos.product.dto.ProductResponseDTO;
import com.baez.baezpos.product.service.service.ProductService;
import com.baez.baezpos.security.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/products")
@RequiredArgsConstructor
@CrossOrigin(origins = "http://localhost:63342")
public class ProductController {

    private final ProductService productService;

    /**
     * Obtenemos el ID de la empresa de forma segura usando SecurityUtils.
     * Esto evita el error de "Tenant no identificado" al estandarizar la forma de obtener al usuario.
     */
    private Long getTenantId() {
        try {
            return SecurityUtils.getCurrentCompanyId();
        } catch (Exception e) {
            // Si llega acá es porque el token no es válido o no tiene la info de la empresa
            throw new RuntimeException("Error de autenticación: Empresa no identificada");
        }
    }

    @GetMapping
    public ResponseEntity<List<ProductResponseDTO>> getAll() {
        return ResponseEntity.ok(productService.getAllProducts(getTenantId()));
    }

    @PostMapping
    public ResponseEntity<ProductResponseDTO> create(@RequestBody ProductRequestDTO dto) {
        return new ResponseEntity<>(productService.createProduct(dto, getTenantId()), HttpStatus.CREATED);
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

    @GetMapping("/deleted")
    public ResponseEntity<List<ProductResponseDTO>> getDeleted() {
        return ResponseEntity.ok(productService.getDeletedProducts(getTenantId()));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<ProductResponseDTO> activate(@PathVariable Long id) {
        return ResponseEntity.ok(productService.activateProduct(id, getTenantId()));
    }
}