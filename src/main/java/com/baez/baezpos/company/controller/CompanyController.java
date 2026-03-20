package com.baez.baezpos.company.controller;

import com.baez.baezpos.company.dto.CompanyDTO;
import com.baez.baezpos.company.service.CompanyService.CompanyService;
import com.baez.baezpos.security.entity.UserPrincipal;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/companies")
@RequiredArgsConstructor
@Slf4j
@CrossOrigin(origins = "*")
public class CompanyController {

    private final CompanyService companyService;

    @GetMapping
    public ResponseEntity<List<CompanyDTO>> getAll() {
        return ResponseEntity.ok(companyService.getAllCompanies());
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompanyDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(companyService.getCompanyById(id));
    }

    @PostMapping
    public ResponseEntity<CompanyDTO> create(@RequestBody CompanyDTO companyDTO) {
        return new ResponseEntity<>(companyService.createCompany(companyDTO), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompanyDTO> update(@PathVariable Long id, @RequestBody CompanyDTO companyDTO) {
        return ResponseEntity.ok(companyService.updateCompany(id, companyDTO));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        companyService.deleteCompany(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/me")
    public ResponseEntity<CompanyDTO> getMyCompany(@AuthenticationPrincipal UserPrincipal user) {
        // Usamos el ID de empresa que viene en el token del usuario logueado
        return ResponseEntity.ok(companyService.getCompanyById(user.getCompanyId()));
    }

    @PutMapping("/me")
    public ResponseEntity<CompanyDTO> updateMyCompany(
            @AuthenticationPrincipal UserPrincipal user,
            @RequestBody CompanyDTO dto) {
        // Solo actualiza la empresa del usuario actual
        return ResponseEntity.ok(companyService.updateCompany(user.getCompanyId(), dto));
    }
}