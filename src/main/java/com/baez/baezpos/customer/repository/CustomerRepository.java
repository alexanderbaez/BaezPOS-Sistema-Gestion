package com.baez.baezpos.customer.repository;

import com.baez.baezpos.customer.entities.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    // Buscar por nombre o DNI (Ya no filtramos por companyId)
    @Query("SELECT c FROM Customer c WHERE " +
            "(LOWER(c.name) LIKE LOWER(concat('%', :query, '%')) OR c.dniCuit LIKE concat('%', :query, '%'))")
    List<Customer> searchCustomers(@Param("query") String query);

    @Query("SELECT COALESCE(SUM(c.currentBalance), 0) FROM Customer c")
    BigDecimal sumAllBalances();
}