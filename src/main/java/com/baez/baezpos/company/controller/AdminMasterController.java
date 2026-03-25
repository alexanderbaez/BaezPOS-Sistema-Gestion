package com.baez.baezpos.company.controller;

import com.baez.baezpos.company.dto.CompanyDTO;
import com.baez.baezpos.company.dto.MasterRegistrationRequest;
import com.baez.baezpos.company.service.CompanyService.MasterADmin;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/superadmin/companies")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AdminMasterController {

    private final MasterADmin masterAdminService;

    @GetMapping
    public ResponseEntity<List<CompanyDTO>> listAll() {
        return ResponseEntity.ok(masterAdminService.getAllCompaniesMaster());
    }

    @PostMapping("/full-register")
    public ResponseEntity<String> fullRegister(@RequestBody MasterRegistrationRequest req) {
        masterAdminService.registerFullBusiness(req);
        return ResponseEntity.ok("Empresa y Dueño creados por Alexander.");
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        masterAdminService.deleteCompanyMaster(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/stats")
    public ResponseEntity<Map<String, Object>> getStats() {
        return ResponseEntity.ok(masterAdminService.getMasterDashboardStats());
    }

    // En AdminMasterController.java

    @PutMapping("/{id}")
    public ResponseEntity<String> update(@PathVariable Long id, @RequestBody CompanyDTO dto) {
        masterAdminService.updateCompanyMaster(id, dto);
        return ResponseEntity.ok("Empresa actualizada correctamente por Alexander.");
    }

    @PatchMapping("/{id}/extend")
    public ResponseEntity<String> extendSubscription(@PathVariable Long id) {
        masterAdminService.extendSubscriptionMaster(id);
        return ResponseEntity.ok("Suscripción extendida 30 días por Alexander.");
    }
}