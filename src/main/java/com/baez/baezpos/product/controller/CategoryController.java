package com.baez.baezpos.product.controller;

import com.baez.baezpos.product.dto.CategoryRequestDTO;
import com.baez.baezpos.product.dto.CategoryResponseDTO;
import com.baez.baezpos.product.service.service.CategoryService;
import com.baez.baezpos.security.entity.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/categories")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CategoryController {

    private final CategoryService categoryService;

    private Long getTenantId() {
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();
        if (principal instanceof UserPrincipal user) {
            return user.getCompanyId();
        }
        throw new RuntimeException("Tenant no identificado");
    }

    @PostMapping
    public ResponseEntity<CategoryResponseDTO> create(@RequestBody CategoryRequestDTO dto) {
        return new ResponseEntity<>(categoryService.createCategory(dto, getTenantId()), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<CategoryResponseDTO>> getAll() {
        return ResponseEntity.ok(categoryService.getAllCategories(getTenantId()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CategoryResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.getCategoryById(id, getTenantId()));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CategoryResponseDTO> update(@PathVariable Long id, @RequestBody CategoryRequestDTO dto) {
        return ResponseEntity.ok(categoryService.updateCategory(id, dto, getTenantId()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        categoryService.deleteCategory(id, getTenantId());
        return ResponseEntity.noContent().build();
    }

    // CategoryController.java

    @GetMapping("/deleted")
    public ResponseEntity<List<CategoryResponseDTO>> getDeleted() {
        return ResponseEntity.ok(categoryService.getDeletedCategories(getTenantId()));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<CategoryResponseDTO> activate(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.activateCategory(id, getTenantId()));
    }
}