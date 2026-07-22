package com.baez.baezpos.util;

public class HardwareIdentificador {

    public static String getSerialNumber() {
        // Intentamos combinar el nombre de la PC y el ID del procesador
        // Esto es único en cada computadora y no requiere permisos especiales
        String pcName = System.getenv("COMPUTERNAME");
        String processorId = System.getenv("PROCESSOR_IDENTIFIER");
        String processorLevel = System.getenv("PROCESSOR_LEVEL");

        if (pcName == null) pcName = "PC-BAEZ";

        // Creamos una cadena única combinando estos datos
        String rawId = pcName + "-" + processorId + "-" + processorLevel;

        // Lo convertimos a un código más limpio (Quitamos espacios)
        return rawId.replaceAll("\\s+", "");
    }
    /**
     * Genera la llave maestra basada en el ID de la PC y un secreto.
     * Esta es la llave que TÚ generarás en tu casa y le darás al cliente.
     */
    public static String generarLlaveMaestra(String pcId) {
        // Este es tu secreto industrial. ¡No lo cambies después de vender el software!
        String miSecretoSoporte = "BAEZ_POS_SECURITY_2026";

        // Mezclamos el ID de la PC con el secreto
        String mezcla = pcId + miSecretoSoporte;

        // Convertimos la mezcla en un número único (Hash)
        int codigoNumerico = Math.abs(mezcla.hashCode());

        // Devolvemos solo los últimos 6 dígitos para que sea fácil de dictar por teléfono
        String codigoFinal = String.valueOf(codigoNumerico);
        if (codigoFinal.length() > 6) {
            return codigoFinal.substring(codigoFinal.length() - 6);
        }
        return codigoFinal;
    }
}