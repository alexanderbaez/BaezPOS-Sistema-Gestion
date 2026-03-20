package com.baez.baezpos.company.service.CompanyService;

import com.baez.baezpos.company.dto.CompanyDTO;
import java.util.List;

public interface CompanyService {
    CompanyDTO createCompany(CompanyDTO companyDTO);
    CompanyDTO getCompanyById(Long id);
    List<CompanyDTO> getAllCompanies();
    CompanyDTO updateCompany(Long id, CompanyDTO companyDTO);
    void deleteCompany(Long id);
}