package com.baez.baezpos.shared.exception; // Asegurate que este sea TU paquete

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.BAD_REQUEST)
public class BadRequestException extends RuntimeException { // <--- Al heredar de RuntimeException, el error desaparece
    public BadRequestException(String message) {
        super(message);
    }
}