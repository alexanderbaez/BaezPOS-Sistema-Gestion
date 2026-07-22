package com.baez.baezpos.customer.entities;

import com.baez.baezpos.sale.entity.Sale;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customer_movements")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CustomerMovement {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false)
    private String type; // "DEBITO" (Deuda) o "CREDITO" (Pago)

    private String description;

    // ESTE ES EL CAMPO QUE TE FALTA PARA EL DASHBOARD
    @Column(name = "payment_method")
    private String paymentMethod; // "EFECTIVO" o "TRANSFERENCIA"

    @ManyToOne(fetch = FetchType.LAZY) // Cambiado a ManyToOne por si un cliente paga varias veces sobre una venta
    @JoinColumn(name = "sale_id")
    private Sale sale;

    @Column(name = "created_at")
    private LocalDateTime createdAt = LocalDateTime.now();

    @PrePersist
    protected void onCreate() {
        if (this.createdAt == null) {
            this.createdAt = LocalDateTime.now();
        }
    }
}