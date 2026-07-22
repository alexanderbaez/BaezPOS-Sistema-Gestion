package com.baez.baezpos.expense.service;

import com.baez.baezpos.expense.dto.ExpenseRequestDTO;
import com.baez.baezpos.expense.entity.Expense;

import java.util.List;

public interface ExpenseService {
    Expense createExpense(ExpenseRequestDTO dto);
    List<Expense> getAllExpenses();
}
