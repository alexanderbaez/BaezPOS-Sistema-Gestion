package com.baez.baezpos.expense.controller;

import com.baez.baezpos.expense.dto.ExpenseRequestDTO;
import com.baez.baezpos.expense.entity.Expense;
import com.baez.baezpos.expense.service.ExpenseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/expenses")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class ExpenseController {

    private final ExpenseService expenseService;

    @PostMapping
    public ResponseEntity<Expense> create(@RequestBody ExpenseRequestDTO dto) {
        log.info("LOCAL: Registrando nuevo gasto por: {}", dto.amount());
        return ResponseEntity.ok(expenseService.createExpense(dto));
    }

    @GetMapping
    public ResponseEntity<List<Expense>> list() {
        return ResponseEntity.ok(expenseService.getAllExpenses());
    }
}