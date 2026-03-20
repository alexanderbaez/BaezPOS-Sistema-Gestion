package com.baez.baezpos.customer.service;

import com.baez.baezpos.company.entity.Company;
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
public class CustomerServiceImpl implements CustomerService{


    private final CustomerRepository customerRepository;
    private final CustomerMovementRepository customerMovementRepository;

    public List<Customer> getAllByCompany(Long companyId) {
        return customerRepository.findByCompanyId(companyId);
    }

    @Transactional
    public Customer saveCustomer(Customer customer, Company company) {
        customer.setCompany(company);
        return customerRepository.save(customer);
    }

    // Lógica para actualizar saldo (La Libreta)
    @Transactional
    public void updateBalance(Long customerId, BigDecimal amount, String type, String description, Sale sale, Company company) {
        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        // 1. Actualizar Saldo del Cliente
        if ("DEBITO".equals(type)) {
            customer.setCurrentBalance(customer.getCurrentBalance().add(amount));
        } else {
            customer.setCurrentBalance(customer.getCurrentBalance().subtract(amount));
        }
        customerRepository.save(customer);

        // 2. Registrar el Movimiento en el Historial
        CustomerMovement movement = new CustomerMovement();
        movement.setCustomer(customer);
        movement.setCompany(company);
        movement.setAmount(amount);
        movement.setType(type);
        movement.setDescription(description);
        movement.setSale(sale);

        // Necesitás un CustomerMovementRepository para esto:
        customerMovementRepository.save(movement);
    }

    @Override
    public List<Customer> searchCustomers(Long companyId, String query) {
        return customerRepository.searchInCompany(companyId, query);
    }

    // Dentro de CustomerServiceImpl...

    @Override
    public List<CustomerMovementDTO> getHistory(Long customerId, Long companyId) {
        List<CustomerMovement> movements = customerMovementRepository.findByCustomerIdAndCompanyIdOrderByIdDesc(customerId, companyId);

        return movements.stream().map(m -> {
            CustomerMovementDTO dto = new CustomerMovementDTO();
            dto.setId(m.getId());
            dto.setAmount(m.getAmount());
            dto.setType(m.getType());
            dto.setDescription(m.getDescription());
            dto.setCreatedAt(m.getCreatedAt());

            // Si el movimiento tiene una venta asociada, cargamos los productos
            if (m.getSale() != null && m.getSale().getItems() != null) {
                List<CustomerMovementDTO.ItemDetailDTO> items = m.getSale().getItems().stream().map(item -> {
                    CustomerMovementDTO.ItemDetailDTO itemDto = new CustomerMovementDTO.ItemDetailDTO();
                    itemDto.setProductName(item.getProduct().getName()); // Ajustá según tus nombres de campos
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
    public Customer updateCustomer(Long id, Customer details, Long companyId) {
        Customer customer = customerRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        // Validamos que el cliente pertenezca a la empresa del usuario
        if (!customer.getCompany().getId().equals(companyId)) {
            throw new RuntimeException("No tiene permisos para editar este cliente");
        }

        customer.setName(details.getName());
        customer.setDniCuit(details.getDniCuit());
        customer.setPhone(details.getPhone());
        customer.setCreditLimit(details.getCreditLimit());

        return customerRepository.save(customer);
    }
}

