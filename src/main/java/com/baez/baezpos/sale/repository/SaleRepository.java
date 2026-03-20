package com.baez.baezpos.sale.repository;

import com.baez.baezpos.sale.entity.Sale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    List<Sale> findByCompanyId(Long companyId);

    // TOTAL GENERAL
    @Query("SELECT COALESCE(SUM(s.total), 0) FROM Sale s WHERE s.company.id = :companyId AND s.saleDate BETWEEN :start AND :end")
    BigDecimal sumTotalByCompanyAndDateRange(@Param("companyId") Long companyId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // TOTAL EFECTIVO
    @Query("SELECT COALESCE(SUM(s.total), 0) FROM Sale s WHERE s.company.id = :companyId AND s.paymentMethod = 'EFECTIVO' AND s.saleDate BETWEEN :start AND :end")
    BigDecimal sumTotalCash(@Param("companyId") Long companyId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // TOTAL TRANSFERENCIA
    @Query("SELECT COALESCE(SUM(s.total), 0) FROM Sale s WHERE s.company.id = :companyId AND s.paymentMethod = 'TRANSFERENCIA' AND s.saleDate BETWEEN :start AND :end")
    BigDecimal sumTotalTransfer(@Param("companyId") Long companyId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.company.id = :companyId AND s.saleDate BETWEEN :start AND :end")
    long countByCompanyAndDateRange(@Param("companyId") Long companyId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(i.subtotal - (i.cost * i.quantity)), 0) FROM Sale s JOIN s.items i WHERE s.company.id = :companyId AND s.saleDate BETWEEN :start AND :end")
    BigDecimal sumNetProfitByCompanyAndDateRange(@Param("companyId") Long companyId, @Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    // Consulta para el gráfico de barras/líneas de los últimos 7 días
    @Query("SELECT CAST(s.saleDate AS date) as fecha, SUM(s.total) as total " +
            "FROM Sale s " +
            "WHERE s.company.id = :companyId " +
            "AND s.saleDate >= :startDate " +
            "GROUP BY CAST(s.saleDate AS date) " +
            "ORDER BY CAST(s.saleDate AS date) ASC")
    List<Object[]> getSalesChartData(@Param("companyId") Long companyId, @Param("startDate") LocalDateTime startDate);

    List<Sale> findByCompanyIdAndSaleDateBetweenOrderBySaleDateDesc(
            Long companyId, LocalDateTime start, LocalDateTime end
    );
    // Agregá esto al final de tu SaleRepository.java
    java.util.Optional<Sale> findByIdAndCompanyId(Long id, Long companyId);

    @Query("SELECT SUM(s.total) FROM Sale s WHERE s.company.id = :companyId " +
            "AND s.saleDate BETWEEN :start AND :end " +
            "AND s.paymentMethod = 'CUENTA_CORRIENTE' AND s.canceled = false")
    BigDecimal sumTotalCredit(Long companyId, LocalDateTime start, LocalDateTime end);
}