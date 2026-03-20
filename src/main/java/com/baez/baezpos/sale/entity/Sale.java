package com.baez.baezpos.sale.entity;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.shared.entity.BaseEntity;
import com.baez.baezpos.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "sales")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Sale extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false)
    private LocalDateTime saleDate;

    // Este total debe ser el FINAL (Subtotal de items - descuento)
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal total;

    // NUEVO: Campo para persistir el descuento aplicado en PESOS
    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal discount = BigDecimal.ZERO;

    @OneToMany(mappedBy = "sale", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<SaleItem> items;

    private String paymentMethod;

    @Column(nullable = false)
    @Builder.Default
    private Boolean canceled = false; // true si la venta fue anulada
}