package com.baez.baezpos.customer.service;

import com.baez.baezpos.customer.dto.CustomerMovementDTO;
import com.baez.baezpos.customer.entities.Customer;
import com.baez.baezpos.sale.entity.Sale;

import java.math.BigDecimal;
import java.util.List;

public interface CustomerService {
    List<Customer> getAll();
    Customer saveCustomer(Customer customer);
    List<Customer> searchCustomers(String query);
    List<CustomerMovementDTO> getHistory(Long customerId);
    Customer updateCustomer(Long id, Customer details);
    void updateBalance(Long customerId, BigDecimal amount, String type, String description, Sale sale, String paymentMethod);
    void processCustomerPayment(Long id, BigDecimal amount, String method);
    void deleteCustomer(Long id);
}