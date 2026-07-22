package com.baez.baezpos.sale.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

public class BoxReportDTO {

    @JsonProperty("totalSales")
    private BigDecimal totalSales;

    @JsonProperty("cashSales")
    private BigDecimal cashSales;

    @JsonProperty("transferSales")
    private BigDecimal transferSales;

    @JsonProperty("tCredit")
    private BigDecimal tCredit;

    @JsonProperty("totalProfit")
    private BigDecimal totalProfit; // Ganancia de hoy

    @JsonProperty("realBalance")
    private BigDecimal realBalance;

    @JsonProperty("monthSales")
    private BigDecimal monthSales;

    @JsonProperty("monthOperations")
    private Long monthOperations;

    // NUEVOS CAMPOS MENSUALES
    @JsonProperty("monthProfit")
    private BigDecimal monthProfit; // Ganancia Real Mensual

    @JsonProperty("monthReplacementCost")
    private BigDecimal monthReplacementCost; // Monto de Reposición Mensual

    // CONSTRUCTOR CORREGIDO: monthOperations vuelve a su posición original (8vo lugar)
    public BoxReportDTO(BigDecimal totalSales, BigDecimal cashSales, BigDecimal transferSales,
                        BigDecimal tCredit, BigDecimal totalProfit, BigDecimal realBalance,
                        BigDecimal monthSales, Long monthOperations,
                        BigDecimal monthProfit, BigDecimal monthReplacementCost) {
        this.totalSales = totalSales;
        this.cashSales = cashSales;
        this.transferSales = transferSales;
        this.tCredit = tCredit;
        this.totalProfit = totalProfit;
        this.realBalance = realBalance;
        this.monthSales = monthSales;
        this.monthOperations = monthOperations;
        this.monthProfit = monthProfit;
        this.monthReplacementCost = monthReplacementCost;
    }

    // Getters públicos para que Jackson los serialice correctamente
    public BigDecimal getTotalSales() { return totalSales; }
    public BigDecimal getCashSales() { return cashSales; }
    public BigDecimal getTransferSales() { return transferSales; }
    public BigDecimal getTCredit() { return tCredit; }
    public BigDecimal getTotalProfit() { return totalProfit; }
    public BigDecimal getRealBalance() { return realBalance; }
    public BigDecimal getMonthSales() { return monthSales; }
    public Long getMonthOperations() { return monthOperations; } // Corregido el tipo de retorno aquí también a Long
    public BigDecimal getMonthProfit() { return monthProfit; }
    public BigDecimal getMonthReplacementCost() { return monthReplacementCost; }
}