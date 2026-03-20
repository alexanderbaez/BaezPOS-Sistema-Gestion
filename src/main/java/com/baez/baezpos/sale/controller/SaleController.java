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

    private Long getTenantId() {
        return 1L;
    }
    private Long getUserId() {
        return 1L;
    } // Asegúrate que este ID existe en tu tabla users

    @PostMapping
    public ResponseEntity<SaleResponseDTO> create(@RequestBody SaleRequestDTO saleDTO) {
        // Extraemos los datos del Token JWT de forma segura
        Long companyId = SecurityUtils.getCurrentCompanyId();
        Long userId = SecurityUtils.getCurrentUserId();

        log.info("REST: Intento de venta - Empresa: {}, Usuario: {}", companyId, userId);

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

        // Si vienen fechas, filtramos. Si no, traemos el historial general.
        if (desde != null && hasta != null) {
            log.info("Filtrando ventas para empresa {} entre {} y {}", companyId, desde, hasta);
            return ResponseEntity.ok(saleService.getSalesByDateRange(desde, hasta, companyId));
        }

        return ResponseEntity.ok(saleService.getAllSalesByCompany(companyId));
    }

    @GetMapping("/report/box")
    public ResponseEntity<BoxReportDTO> getBoxReport() {
        return ResponseEntity.ok(saleService.getBoxReport(getTenantId()));
    }

    // NUEVO: Endpoint para el Gráfico (Histórico 7 días)
    @GetMapping("/report/chart")
    public ResponseEntity<List<ChartDataDTO>> getSalesChartData() {
        return ResponseEntity.ok(saleService.getSalesChartData(getTenantId()));
    }

    @PutMapping("/{id}/cancel")
    public ResponseEntity<Void> cancelSale(@PathVariable Long id) {
        // Usamos el service que ya tiene la lógica de devolver stock
        saleService.cancelSale(id, getTenantId());
        return ResponseEntity.noContent().build();
    }

}