package com.baez.baezpos.customer.service;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.customer.dto.CustomerMovementDTO;
import com.baez.baezpos.customer.entities.Customer;
import com.baez.baezpos.customer.entities.CustomerMovement;
import com.baez.baezpos.sale.entity.Sale;

import java.math.BigDecimal;
import java.util.List;

public interface CustomerService {
    List<Customer> getAllByCompany(Long companyId);
    Customer saveCustomer(Customer customer, Company company);
    void updateBalance(Long customerId, BigDecimal amount, String type, String description, Sale sale, Company company);
    List<Customer> searchCustomers(Long companyId, String query);
    List<CustomerMovementDTO> getHistory(Long customerId, Long companyId);
    Customer updateCustomer(Long id, Customer details, Long companyId);

}
