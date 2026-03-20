package com.baez.baezpos.product.dto;

import java.math.BigDecimal;

/**
 * DTO para enviar datos al Frontend (Listar/Cargar Formulario)
 */
public record ProductResponseDTO(
        Long id,
        String name,
        String categoryName, // Para la tabla
        Long categoryId,     // PARA EL SELECT EN EDICIÓN
        BigDecimal price,
        BigDecimal cost,      // PARA EL CAMPO COSTO EN EDICIÓN
        Integer stock,
        Integer minStock,    // PARA EL CAMPO MÍNIMO EN EDICIÓN
        String barcode       // Unificado en minúsculas para coincidir con el Request
) {}