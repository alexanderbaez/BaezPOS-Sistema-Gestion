package com.baez.baezpos.sale.dto;

import java.math.BigDecimal;
import java.util.List;


public record SaleRequestDTO(
        List<SaleItemRequestDTO> items,
        BigDecimal discount,
        String paymentMethod,
        Long customerId
) {}