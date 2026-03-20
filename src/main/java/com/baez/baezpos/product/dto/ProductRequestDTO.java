package com.baez.baezpos.product.dto;

import java.math.BigDecimal;

/**
 * DTO para recibir datos desde el Frontend (Crear/Actualizar)
 */
public record ProductRequestDTO(
        String name,
        String description,
        String barcode,      // Unificado en minúsculas
        BigDecimal cost,     // Mapped to "prodCosto"
        BigDecimal price,    // Mapped to "prodPrecio"
        Integer stock,
        Integer minStock,    // Mapped to "prodMinStock"
        Long categoryId      // Mapped to "prodCategoria"
) {}