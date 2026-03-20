package com.baez.baezpos.customer.repository;

import com.baez.baezpos.customer.entities.CustomerMovement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CustomerMovementRepository extends JpaRepository<CustomerMovement, Long> {

    /**
     * Obtiene el historial de la "libreta" de un cliente específico.
     * Filtramos por companyId por seguridad Multi-tenant.
     * Ordenamos por ID descendente para ver lo último primero.
     */
    List<CustomerMovement> findByCustomerIdAndCompanyIdOrderByIdDesc(Long customerId, Long companyId);

    /**
     * Opcional: Obtener todos los movimientos de una empresa en un rango de fechas
     * (Útil para auditorías generales de fiado).
     */
    List<CustomerMovement> findByCompanyId(Long companyId);
}