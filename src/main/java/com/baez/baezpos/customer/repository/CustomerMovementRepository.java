package com.baez.baezpos.customer.repository;

import com.baez.baezpos.customer.entities.CustomerMovement;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface CustomerMovementRepository extends JpaRepository<CustomerMovement, Long> {
    // Historial de la libreta por cliente
    @EntityGraph(attributePaths = {"sale", "sale.items"})
    List<CustomerMovement> findByCustomerIdOrderByIdDesc(Long customerId);

    @Query("SELECT COALESCE(SUM(cm.amount), 0) FROM CustomerMovement cm " +
            "WHERE cm.type = 'CREDITO' AND cm.createdAt BETWEEN :start AND :end")
    BigDecimal sumCreditsByDateRange(@Param("start") LocalDateTime start, @Param("end") LocalDateTime end);

    @Query("SELECT COALESCE(SUM(cm.amount), 0) FROM CustomerMovement cm " +
            "WHERE cm.type = 'CREDITO' AND cm.paymentMethod = :method " +
            "AND cm.createdAt BETWEEN :start AND :end")
    BigDecimal sumPaymentsByMethod(@Param("method") String method,
                                   @Param("start") LocalDateTime start,
                                   @Param("end") LocalDateTime end);
}