package com.baez.baezpos.customer.service;

import com.baez.baezpos.customer.dto.CustomerMovementDTO;
import com.baez.baezpos.customer.entities.Customer;
import com.baez.baezpos.customer.entities.CustomerMovement;
import com.baez.baezpos.customer.repository.CustomerMovementRepository;
import com.baez.baezpos.customer.repository.CustomerRepository;
import com.baez.baezpos.sale.entity.Sale;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CustomerServiceImpl implements CustomerService {

    private final CustomerRepository customerRepository;
    private final CustomerMovementRepository customerMovementRepository;

    @Override
    public List<Customer> getAll() {
        return customerRepository.findAll();
    }

    @Override
    @Transactional
    public Customer saveCustomer(Customer customer) {
        return customerRepository.save(customer);
    }

    @Override
    @Transactional
    public void updateBalance(Long customerId, BigDecimal amount, String type, String description, Sale sale, String paymentMethod) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        if ("DEBITO".equals(type)) {
            customer.setCurrentBalance(customer.getCurrentBalance().add(amount));
        } else {
            customer.setCurrentBalance(customer.getCurrentBalance().subtract(amount));
        }
        customerRepository.save(customer);

        CustomerMovement movement = new CustomerMovement();
        movement.setCustomer(customer);
        movement.setAmount(amount);
        movement.setType(type);
        movement.setDescription(description);
        movement.setSale(sale);

        if (sale != null) {
            movement.setPaymentMethod(sale.getPaymentMethod());
        } else {
            movement.setPaymentMethod(paymentMethod != null ? paymentMethod : "EFECTIVO");
        }

        customerMovementRepository.save(movement);
    }

    @Override
    public List<Customer> searchCustomers(String query) {
        return customerRepository.searchCustomers(query);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CustomerMovementDTO> getHistory(Long customerId) {
        List<CustomerMovement> movements = customerMovementRepository.findByCustomerIdOrderByIdDesc(customerId);

        return movements.stream().map(m -> {
            CustomerMovementDTO dto = new CustomerMovementDTO();
            dto.setId(m.getId());
            dto.setAmount(m.getAmount());
            dto.setType(m.getType());
            dto.setDescription(m.getDescription());
            dto.setCreatedAt(m.getCreatedAt());

            if (m.getSale() != null && m.getSale().getItems() != null) {
                List<CustomerMovementDTO.ItemDetailDTO> items = m.getSale().getItems().stream().map(item -> {
                    CustomerMovementDTO.ItemDetailDTO itemDto = new CustomerMovementDTO.ItemDetailDTO();
                    itemDto.setProductName(item.getProduct().getName());
                    itemDto.setQuantity(item.getQuantity());
                    itemDto.setPrice(item.getPrice());
                    return itemDto;
                }).toList();
                dto.setItemsDetail(items);
            }
            return dto;
        }).toList();
    }

    @Override
    @Transactional
    public Customer updateCustomer(Long id, Customer details) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        customer.setName(details.getName());
        customer.setDniCuit(details.getDniCuit());
        customer.setPhone(details.getPhone());
        customer.setCreditLimit(details.getCreditLimit());

        return customerRepository.save(customer);
    }

    @Override
    @Transactional
    public void processCustomerPayment(Long id, BigDecimal amount, String method) {
        this.updateBalance(
                id,
                amount,
                "CREDITO",
                "Pago de cuenta corriente - " + method,
                null,
                method
        );
    }

    @Override
    @Transactional
    public void deleteCustomer(Long id) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        // 1. Limpiamos movimientos asociados si los tiene
        List<CustomerMovement> movements = customerMovementRepository.findByCustomerIdOrderByIdDesc(id);
        if (!movements.isEmpty()) {
            customerMovementRepository.deleteAll(movements);
        }

        // 2. Eliminamos el cliente
        customerRepository.delete(customer);
    }
}