package com.baez.baezpos.customer.repository;

import com.baez.baezpos.customer.entities.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerRepository extends JpaRepository<Customer, Long> {
    // Listar todos los clientes de una empresa específica
    List<Customer> findByCompanyId(Long companyId);

    // Buscar por nombre o DNI dentro de la empresa (Para el buscador del POS)
    @Query("SELECT c FROM Customer c WHERE c.company.id = :companyId AND " +
            "(LOWER(c.name) LIKE LOWER(concat('%', :query, '%')) OR c.dniCuit LIKE concat('%', :query, '%'))")
    List<Customer> searchInCompany(@Param("companyId") Long companyId, @Param("query") String query);
}