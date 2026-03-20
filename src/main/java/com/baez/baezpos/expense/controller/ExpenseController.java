package com.baez.baezpos.expense.controller;

import com.baez.baezpos.expense.dto.ExpenseRequestDTO;
import com.baez.baezpos.expense.entity.Expense;
import com.baez.baezpos.expense.service.ExpenseService;
import com.baez.baezpos.security.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/expenses") // Estándar v1
@RequiredArgsConstructor
@Slf4j // Agregamos para auditoría
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    public ResponseEntity<Expense> create(@RequestBody ExpenseRequestDTO dto) {
        Long companyId = SecurityUtils.getCurrentCompanyId();
        log.info("Finanzas: Registrando gasto para Empresa ID: {}", companyId);
        return ResponseEntity.ok(expenseService.createExpense(dto, companyId));
    }

    @GetMapping
    public ResponseEntity<List<Expense>> list() {
        return ResponseEntity.ok(expenseService.getAllByCompany(SecurityUtils.getCurrentCompanyId()));
    }
}