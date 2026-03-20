package com.baez.baezpos.sale.dto;

import java.math.BigDecimal;

public record SaleItemRequestDTO(
        Long productId,
        Integer quantity,
        BigDecimal price
) {}