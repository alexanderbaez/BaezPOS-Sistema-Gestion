package com.baez.baezpos.sale.entity;

import com.baez.baezpos.product.entity.Product;
import com.fasterxml.jackson.annotation.JsonBackReference;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

// Sale.java se mantiene similar, pero asegúrate de que el total se calcule en el backend
// SaleItem.java: Agregamos el costo histórico para calcular rentabilidad real luego
@Entity
@Table(name = "sale_items")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class SaleItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sale_id", nullable = false)
    @JsonBackReference // Evita recursión infinita en JSON
    private Sale sale;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(nullable = false)
    private Integer quantity;

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal price; // Precio de venta al momento de la transacción

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal cost; // Costo del producto al momento (para reportes de ganancia)

    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal subtotal;
}