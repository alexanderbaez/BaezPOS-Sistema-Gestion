package com.baez.baezpos.sale.dto;

import java.math.BigDecimal;
import java.util.List;

public record SaleRequestDTO(
        List<SaleItemRequestDTO> items,
        BigDecimal discount,
        BigDecimal surcharge,     // <--- NUEVO: Monto $ del recargo
        BigDecimal surchargeRate, // <--- NUEVO: Porcentaje % del recargo
        String paymentMethod,
        Long customerId,
        Boolean isFiscal
) {}