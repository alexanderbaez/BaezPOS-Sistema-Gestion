package com.baez.baezpos.sale.controller;

import com.baez.baezpos.sale.dto.BoxReportDTO;
import com.baez.baezpos.sale.dto.ChartDataDTO;
import com.baez.baezpos.sale.dto.SaleRequestDTO;
import com.baez.baezpos.sale.dto.SaleResponseDTO;
import com.baez.baezpos.sale.entity.Sale;
import com.baez.baezpos.sale.service.SaleService.SaleService;
import com.baez.baezpos.security.util.SecurityUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@Slf4j
@RequestMapping("/api/v1/sales")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SaleController {

    private final SaleService saleService;

    @PostMapping
    public ResponseEntity<SaleResponseDTO> create(@RequestBody SaleRequestDTO saleDTO) {
        Long companyId = SecurityUtils.getCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        log.info("REST: Creando venta - Empresa: {}, Usuario: {}", companyId, userId);

        return new ResponseEntity<>(
                saleService.createSale(saleDTO, companyId, userId),
                HttpStatus.CREATED
        );
    }

    @GetMapping
    public ResponseEntity<List<SaleResponseDTO>> list(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {

        Long companyId = SecurityUtils.getCurrentCompanyId();

        // LOGS PARA DEPURAR (Miralos en la consola de IntelliJ)
        log.info("Historial solicitado - Empresa: {}, Desde: {}, Hasta: {}", companyId, desde, hasta);

        // Si el frontend no manda fechas, buscamos las de HOY por defecto
        if (desde == null || hasta == null) {
            desde = LocalDate.now();
            hasta = LocalDate.now();
        }

        List<SaleResponseDTO> ventas = saleService.getSalesByDateRange(desde, hasta, companyId);
        log.info("Ventas encontradas: {}", ventas.size());

        return ResponseEntity.ok(ventas);
    }

    // --- CORREGIDO: Ahora usa el ID del Token ---
    @GetMapping("/report/box")
    public ResponseEntity<BoxReportDTO> getBoxReport() {
        Long companyId = SecurityUtils.getCurrentCompanyId();
        return ResponseEntity.ok(saleService.getBoxReport(companyId));
    }

    // --- CORREGIDO: Ahora usa el ID del Token ---
    @GetMapping("/report/chart")
    public ResponseEntity<List<ChartDataDTO>> getSalesChartData() {
        Long companyId = SecurityUtils.getCurrentCompanyId();
        return ResponseEntity.ok(saleService.getSalesChartData(companyId));
    }

    // --- CORREGIDO: Ahora usa el ID del Token ---
    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelSale(@PathVariable Long id) {
        Long companyId = SecurityUtils.getCurrentCompanyId();
        saleService.cancelSale(id, companyId);
        return ResponseEntity.noContent().build();
    }
}