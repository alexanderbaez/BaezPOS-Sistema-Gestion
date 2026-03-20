package com.baez.baezpos.sale.dto;

import java.math.BigDecimal;

public record SaleItemResponseDTO(
        String productName,
        Integer quantity,
        BigDecimal price,
        BigDecimal subtotal
) {}