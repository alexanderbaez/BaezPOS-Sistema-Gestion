package com.baez.baezpos.customer.controller;

import com.baez.baezpos.customer.dto.CustomerMovementDTO;
import com.baez.baezpos.customer.dto.PaymentRequestDTO;
import com.baez.baezpos.customer.entities.Customer;
import com.baez.baezpos.customer.service.CustomerService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class CustomerController {

    private final CustomerService customerService;

    @GetMapping
    public ResponseEntity<List<Customer>> listCustomers() {
        return ResponseEntity.ok(customerService.getAll());
    }

    @PostMapping
    public ResponseEntity<Customer> create(@RequestBody Customer customer) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerService.saveCustomer(customer));
    }

    @GetMapping("/search")
    public ResponseEntity<List<Customer>> search(@RequestParam String q) {
        return ResponseEntity.ok(customerService.searchCustomers(q));
    }

    @GetMapping("/{id}/movements")
    public ResponseEntity<List<CustomerMovementDTO>> getHistory(@PathVariable Long id) {
        return ResponseEntity.ok(customerService.getHistory(id));
    }

    @PostMapping("/{id}/payments")
    public ResponseEntity<String> receivePayment(@PathVariable Long id, @RequestBody PaymentRequestDTO paymentDTO) {

        if (paymentDTO.getAmount() == null || paymentDTO.getMethod() == null) {
            return ResponseEntity.badRequest().body("Datos incompletos");
        }

        customerService.processCustomerPayment(id, paymentDTO.getAmount(), paymentDTO.getMethod());
        return ResponseEntity.ok("Pago registrado con éxito");
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> update(@PathVariable Long id, @RequestBody Customer customer) {
        return ResponseEntity.ok(customerService.updateCustomer(id, customer));
    }

    // NUEVO ENDPOINT PARA ELIMINAR CLIENTE
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        try {
            customerService.deleteCustomer(id);
            return ResponseEntity.ok().body(Map.of("message", "Cliente eliminado con éxito"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}