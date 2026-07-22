package com.baez.baezpos.expense.service;

import com.baez.baezpos.expense.dto.ExpenseRequestDTO;
import com.baez.baezpos.expense.entity.Expense;
import com.baez.baezpos.expense.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ExpenseServiceImpl implements ExpenseService {

    private final ExpenseRepository expenseRepository;

    @Override
    @Transactional
    public Expense createExpense(ExpenseRequestDTO dto) {
        Expense expense = Expense.builder()
                .description(dto.description())
                .amount(dto.amount())
                .expenseDate(LocalDateTime.now())
                .build();

        return expenseRepository.save(expense);
    }

    @Override
    @Transactional(readOnly = true)
    public List<Expense> getAllExpenses() {
        return expenseRepository.findAllByOrderByExpenseDateDesc();
    }
}