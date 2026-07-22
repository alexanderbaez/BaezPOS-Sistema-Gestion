package com.baez.baezpos.sale.repository;

import com.baez.baezpos.sale.entity.Sale;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface SaleRepository extends JpaRepository<Sale, Long> {

    // CONSULTA MAESTRA PARA DASHBOARD (Optimizado para SQLite)
    @Query(value = "SELECT date(sale_date) as fecha, " +
            "SUM(CASE WHEN payment_method = 'EFECTIVO' THEN total ELSE 0 END) as efectivo, " +
            "SUM(CASE WHEN payment_method = 'TRANSFERENCIA' THEN total ELSE 0 END) as transferencia, " +
            "SUM(CASE WHEN payment_method = 'CUENTA_CORRIENTE' THEN total ELSE 0 END) as fiado, " +
            "SUM(total) as total_dia " +
            "FROM sales WHERE date(sale_date) = :today AND canceled = 0", nativeQuery = true)
    List<Object[]> getTodayStats(@Param("today") String today);

    // GRÁFICO 7 DÍAS (Lo que sí te funciona)
    @Query(value = "SELECT date(sale_date) as fecha, SUM(total) as total " +
            "FROM sales WHERE date(sale_date) >= date('now', 'localtime', '-7 days') AND canceled = 0 " +
            "GROUP BY date(sale_date) ORDER BY fecha ASC", nativeQuery = true)
    List<Object[]> getSalesChartData();

    // Mantenemos tus otros métodos JPQL para reportes por rango
    @Query("SELECT COALESCE(SUM(s.total), 0) FROM Sale s WHERE s.saleDate BETWEEN :start AND :end AND s.canceled = false")
    BigDecimal sumTotalByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COUNT(s) FROM Sale s WHERE s.saleDate BETWEEN :start AND :end AND s.canceled = false")
    long countByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    List<Sale> findBySaleDateBetweenOrderBySaleDateDesc(LocalDateTime start, LocalDateTime end);

    // ESTO ES LO QUE TE FALTA:
    List<Sale> findByCanceledFalse();

    // También asegúrate de tener este para los rangos de fecha que usas en el gráfico:
    List<Sale> findBySaleDateBetweenAndCanceledFalse(java.time.LocalDateTime start, java.time.LocalDateTime end);
}