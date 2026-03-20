package com.baez.baezpos.sale.dto;

import java.math.BigDecimal;

public record ChartDataDTO(
        String label,     // Aquí irá la fecha (ej: "2026-03-20")
        BigDecimal total  // Aquí el monto total vendido ese día
) {}