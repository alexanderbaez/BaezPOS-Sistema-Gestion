package com.baez.baezpos.sale.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record SaleResponseDTO(
        Long id,
        LocalDateTime saleDate,
        BigDecimal total,
        BigDecimal discount,
        BigDecimal surcharge,     // <--- NUEVO
        BigDecimal surchargeRate, // <--- NUEVO
        String paymentMethod,
        String userName,
        String companyName,
        String companyCuit,
        String companyAddress,
        List<SaleItemResponseDTO> items,

        // Campos fiscales ARCA
        String cae,
        String caeVto,
        String tipoComprobante,
        String nroComprobante
) {}