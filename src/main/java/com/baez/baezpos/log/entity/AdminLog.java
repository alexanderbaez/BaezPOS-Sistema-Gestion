package com.baez.baezpos.log.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "admin_logs")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@Builder
public class AdminLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String action; // Ej: "CREACION", "EDICION", "EXTENCION_ABONO"

    @Column(columnDefinition = "TEXT")
    private String description; // Ej: "Se extendió abono a Empresa X por 30 días"

    @Column(nullable = false)
    private String adminUser; // El email del admin que hizo la acción

    private LocalDateTime timestamp;

    @PrePersist
    protected void onCreate() {
        this.timestamp = LocalDateTime.now();
    }
}