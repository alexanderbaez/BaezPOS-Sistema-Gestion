package com.baez.baezpos.product.controller;

import com.baez.baezpos.product.dto.CategoryRequestDTO;
import com.baez.baezpos.product.dto.CategoryResponseDTO;
import com.baez.baezpos.product.service.service.CategoryService;
import com.baez.baezpos.security.entity.UserPrincipal;
import com.baez.baezpos.security.util.SecurityUtils; // Importamos tu utilidad
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

    // Cambiamos la lógica interna para usar SecurityUtils como en Products
// En tu CategoryController.java

    private Long getTenantId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            throw new RuntimeException("No hay una sesión activa.");
        }

        Object principal = authentication.getPrincipal();

        // Debug para ver qué está llegando realmente a la consola de IntelliJ
        System.out.println("DEBUG - Tipo de principal: " + principal.getClass().getName());

        if (principal instanceof UserPrincipal user) {
            // Si el ID es null o 0, significa que el usuario en la DB tiene la columna company_id VACÍA
            if (user.getCompanyId() == null || user.getCompanyId() == 0) {
                System.err.println("ERROR: El usuario " + user.getUsername() + " no tiene companyId en la DB");
                throw new RuntimeException("Tu usuario no tiene una empresa asignada en la Base de Datos.");
            }
            return user.getCompanyId();
        }

        // Si el principal es un String, es porque el Filtro falló al setear el UserPrincipal
        throw new RuntimeException("Error de sesión: Se esperaba UserPrincipal pero se recibió " + principal.getClass().getSimpleName());
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

    @GetMapping("/deleted")
    public ResponseEntity<List<CategoryResponseDTO>> getDeleted() {
        return ResponseEntity.ok(categoryService.getDeletedCategories(getTenantId()));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<CategoryResponseDTO> activate(@PathVariable Long id) {
        return ResponseEntity.ok(categoryService.activateCategory(id, getTenantId()));
    }
}