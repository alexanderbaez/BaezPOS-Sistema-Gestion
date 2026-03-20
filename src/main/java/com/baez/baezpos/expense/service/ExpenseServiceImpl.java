package com.baez.baezpos.expense.service;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.company.repository.CompanyRepository;
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
public class ExpenseServiceImpl implements ExpenseService{

    private final ExpenseRepository expenseRepository;
    private final CompanyRepository companyRepository;

    @Transactional
    public Expense createExpense(ExpenseRequestDTO dto, Long companyId) {
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada con ID: " + companyId));

        Expense expense = Expense.builder()
                .description(dto.description())
                .amount(dto.amount())
                .expenseDate(LocalDateTime.now())
                .company(company)
                .build();

        return expenseRepository.save(expense);
    }

    @Transactional(readOnly = true)
    public List<Expense> getAllByCompany(Long companyId) {
        return expenseRepository.findByCompanyIdOrderByExpenseDateDesc(companyId);
    }
}