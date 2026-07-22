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
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Customer {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;
    private String phone;
    private String dniCuit;

    @Column(precision = 10, scale = 2)
    private BigDecimal currentBalance = BigDecimal.ZERO;

    @Column(precision = 10, scale = 2)
    private BigDecimal creditLimit = BigDecimal.valueOf(10000);

    private LocalDateTime createdAt = LocalDateTime.now();

    // ELIMINADO: Company company
}