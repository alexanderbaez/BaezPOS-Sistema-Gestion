package com.baez.baezpos.customer.dto;

import lombok.Data;
import java.math.BigDecimal;

@Data
public class PaymentRequestDTO {
    private BigDecimal amount;
    private String method; // Debe ser "EFECTIVO" o "TRANSFERENCIA"
}
