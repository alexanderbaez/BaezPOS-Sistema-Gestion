package com.baez.baezpos.sale.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SaleResponseDTO(
        Long id,
        LocalDateTime saleDate,
        BigDecimal total,
        BigDecimal discount,
        String paymentMethod, // <--- Debe estar en esta posición
        String userName,
        String companyName,
        String taxId,
        String address,
        List<SaleItemResponseDTO> items
) {}