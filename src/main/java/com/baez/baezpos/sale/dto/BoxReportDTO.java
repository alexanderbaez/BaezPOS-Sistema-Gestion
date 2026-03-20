package com.baez.baezpos.sale.dto;

import java.math.BigDecimal;

public record BoxReportDTO(
        BigDecimal todaySales,      // Total vendido (Efectivo + Transf + Libreta)
        BigDecimal cashSales,       // Solo efectivo
        BigDecimal transferSales,   // Solo transferencia
        BigDecimal creditSales,     // <--- NUEVO: Lo que "deben" (Libreta)
        BigDecimal todayProfit,
        BigDecimal todayExpenses,
        BigDecimal finalBalance,    // Dinero real en mano (Cash + Transf - Gastos)
        BigDecimal monthSales,
        BigDecimal monthProfit,
        BigDecimal lastMonthSales,
        long todayCount
) {}