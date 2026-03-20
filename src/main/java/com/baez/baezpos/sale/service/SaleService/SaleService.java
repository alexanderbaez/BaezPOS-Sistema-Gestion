package com.baez.baezpos.sale.service.SaleService;

import com.baez.baezpos.sale.dto.BoxReportDTO;
import com.baez.baezpos.sale.dto.ChartDataDTO;
import com.baez.baezpos.sale.dto.SaleRequestDTO;
import com.baez.baezpos.sale.dto.SaleResponseDTO;
import com.baez.baezpos.sale.entity.Sale;
import org.springframework.web.bind.annotation.PathVariable;

import java.time.LocalDate;
import java.util.List;

public interface SaleService {
    SaleResponseDTO createSale(SaleRequestDTO saleDTO, Long companyId, Long userId);
    SaleResponseDTO getSaleById(Long id, Long companyId);
    List<SaleResponseDTO> getAllSalesByCompany(Long companyId);
    BoxReportDTO getBoxReport(Long companyId);
    List<ChartDataDTO> getSalesChartData(Long companyId);
    void cancelSale(Long saleId, Long companyId);
    List<SaleResponseDTO> getSalesByDateRange(LocalDate desde, LocalDate hasta, Long companyId);

}
