package com.baez.baezpos.log.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "system_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class SystemLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String action; // Ej: "VENTA", "ELIMINACION_PRODUCTO", "AJUSTE_STOCK"

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false)
    private String userEmail; // Quién hizo la acción

    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}