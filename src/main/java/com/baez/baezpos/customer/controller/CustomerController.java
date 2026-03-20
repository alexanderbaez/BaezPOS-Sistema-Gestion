package com.baez.baezpos.customer.controller;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.customer.dto.CustomerMovementDTO;
import com.baez.baezpos.customer.entities.Customer;
import com.baez.baezpos.customer.entities.CustomerMovement;
import com.baez.baezpos.customer.service.CustomerService;
import com.baez.baezpos.security.entity.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/v1/customers")
@RequiredArgsConstructor
public class CustomerController {

    private final CustomerService customerService;

    // 1. LISTAR TODOS
    @GetMapping
    public ResponseEntity<List<Customer>> listCustomers(@AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(customerService.getAllByCompany(user.getCompanyId()));
    }

    // 2. CREAR NUEVO CLIENTE
    @PostMapping
    public ResponseEntity<Customer> create(@RequestBody Customer customer, @AuthenticationPrincipal UserPrincipal user) {
        Company company = new Company();
        company.setId(user.getCompanyId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(customerService.saveCustomer(customer, company));
    }

    // 3. BUSCADOR RÁPIDO PARA EL POS
    @GetMapping("/search")
    public ResponseEntity<List<Customer>> search(@RequestParam String q, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(customerService.searchCustomers(user.getCompanyId(), q));
    }

    // 4. VER HISTORIAL DE LA LIBRETA (MOVIMIENTOS)
    @GetMapping("/{id}/movements")
    public ResponseEntity<List<CustomerMovementDTO>> getHistory(@PathVariable Long id, @AuthenticationPrincipal UserPrincipal user) {
        return ResponseEntity.ok(customerService.getHistory(id, user.getCompanyId()));
    }

    // 5. REGISTRAR UN PAGO (CUANDO EL VECINO TRAE PLATA)
    @PostMapping("/{id}/payments")
    public ResponseEntity<String> receivePayment(
            @PathVariable Long id,
            @RequestBody BigDecimal amount,
            @AuthenticationPrincipal UserPrincipal user) {

        Company company = new Company();
        company.setId(user.getCompanyId());

        // Registramos un CRÉDITO (Baja la deuda)
        customerService.updateBalance(id, amount, "CREDITO", "Pago de cuenta corriente", null, company);

        return ResponseEntity.ok("Pago registrado con éxito");
    }

    @PutMapping("/{id}")
    public ResponseEntity<Customer> update(
            @PathVariable Long id,
            @RequestBody Customer customer,
            @AuthenticationPrincipal UserPrincipal user) {

        return ResponseEntity.ok(customerService.updateCustomer(id, customer, user.getCompanyId()));
    }

}