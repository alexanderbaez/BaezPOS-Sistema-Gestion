package com.baez.baezpos.customer.entities;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.sale.entity.Sale; // Asumo que tenés una entidad Sale
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_movements")
@Data
@NoArgsConstructor
public class CustomerMovement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String type; // "DEBITO" (Aumenta deuda) o "CREDITO" (Paga deuda)

    private String description; // Ej: "Venta #150" o "Entrega de efectivo"

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id")
    private Sale sale; // Opcional: vinculado a una venta real

    private LocalDateTime createdAt = LocalDateTime.now();
}