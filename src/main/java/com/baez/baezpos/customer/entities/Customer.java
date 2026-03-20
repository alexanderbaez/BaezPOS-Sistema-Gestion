package com.baez.baezpos.customer.entities;

import com.baez.baezpos.company.entity.Company;
import jakarta.persistence.*;
import lombok.Data; // <--- Importante
import lombok.NoArgsConstructor; // <--- Importante
import lombok.AllArgsConstructor; // <--- Importante

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "customers")
@Data // <--- Esto genera automáticamente los Getters y Setters que te faltan
@NoArgsConstructor // Genera constructor vacío requerido por JPA
@AllArgsConstructor // Genera constructor con todos los campos
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    private String phone;
    private String dniCuit;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "company_id", nullable = false)
    private Company company;

    @Column(precision = 10, scale = 2)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal creditLimit = BigDecimal.valueOf(10000);

    private LocalDateTime createdAt = LocalDateTime.now();
}