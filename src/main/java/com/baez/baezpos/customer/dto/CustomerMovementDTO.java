package com.baez.baezpos.customer.dto;

import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
public class CustomerMovementDTO {
    private Long id;
    private BigDecimal amount;
    private String type;
    private String description;
    private LocalDateTime createdAt;
    private List<ItemDetailDTO> itemsDetail; // <--- AQUÍ ESTÁ EL SECRETO


    @Data
    public static class ItemDetailDTO {
        private String productName;
        private Integer quantity;
        private BigDecimal price;
    }
}
