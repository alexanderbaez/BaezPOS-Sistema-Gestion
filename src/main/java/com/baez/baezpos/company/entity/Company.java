package com.baez.baezpos.company.entity;

import com.baez.baezpos.shared.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDate;

@Entity
@Table(name = "companies")
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor
@SuperBuilder
@SQLDelete(sql = "UPDATE companies SET active = false WHERE id = ?")
//@SQLRestriction("active = true") // Por defecto, solo vemos las activas
public class Company extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "tax_id", length = 20, unique = true, nullable = false)
    private String taxId;

    @Column(length = 255)
    private String address;

    @Column(length = 20)
    private String phone;

    @Column(name = "expiration_date")
    private LocalDate expirationDate;

    @Column(nullable = false)
    private Boolean active = true;

    @Column(name = "ticket_message", columnDefinition = "TEXT")
    private String ticketMessage; // Ej: "¡Gracias por su compra! Vuelva pronto."

    @Column(name = "logo_url")
    private String logoUrl; // Por si en el futuro quiere subir una imagen

    @Column(length = 100)
    private String email; // Para contacto administrativo
}