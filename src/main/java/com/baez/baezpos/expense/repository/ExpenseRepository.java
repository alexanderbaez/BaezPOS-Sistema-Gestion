package com.baez.baezpos.expense.repository;

import com.baez.baezpos.expense.entity.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {

    // Lista histórica de gastos por empresa
    List<Expense> findByCompanyIdOrderByExpenseDateDesc(Long companyId);

    // Suma de gastos para el reporte financiero
    @Query("SELECT SUM(e.amount) FROM Expense e WHERE e.company.id = :companyId AND e.expenseDate BETWEEN :start AND :end")
    BigDecimal sumTotalByCompanyAndDateRange(
            @Param("companyId") Long companyId,
            @Param("start") LocalDateTime start,
            @Param("end") LocalDateTime end);
}