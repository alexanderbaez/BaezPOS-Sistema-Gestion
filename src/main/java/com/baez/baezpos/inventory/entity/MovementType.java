package com.baez.baezpos.inventory.entity;

public enum MovementType {
    PURCHASE,       // Entrada (+)
    SALE,           // Salida (-)
    ADJUSTMENT_IN,  // Entrada manual (+)
    ADJUSTMENT_OUT, // Salida manual/merma (-)
    DAMAGE,         // Rotura (-)
    RETURN          // Devolución de cliente (+)
}
