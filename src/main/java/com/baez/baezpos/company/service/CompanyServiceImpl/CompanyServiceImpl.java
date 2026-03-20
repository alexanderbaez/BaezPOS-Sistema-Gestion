package com.baez.baezpos.company.service.CompanyServiceImpl;

import com.baez.baezpos.company.dto.CompanyDTO;
import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.company.repository.CompanyRepository;
import com.baez.baezpos.company.service.CompanyService.CompanyService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyServiceImpl implements CompanyService {

    private final CompanyRepository companyRepository;

    @Override
    @Transactional(readOnly = true)
    public List<CompanyDTO> getAllCompanies() {
        return companyRepository.findAll()
                .stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public CompanyDTO getCompanyById(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada con ID: " + id));
        return convertToDTO(company);
    }

    @Override
    @Transactional
    public CompanyDTO createCompany(CompanyDTO dto) {
        if (companyRepository.existsByTaxId(dto.getTaxId())) {
            throw new RuntimeException("Error: El identificador fiscal (TaxID) ya está registrado.");
        }

        Company company = Company.builder()
                .name(dto.getName())
                .taxId(dto.getTaxId())
                .address(dto.getAddress())
                .phone(dto.getPhone())
                .expirationDate(dto.getExpirationDate() != null ? dto.getExpirationDate() : LocalDate.now().plusMonths(1))
                .active(true)
                .build();

        return convertToDTO(companyRepository.save(company));
    }

    @Override
    @Transactional
    public CompanyDTO updateCompany(Long id, CompanyDTO dto) {
        Company existing = companyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada."));

        // Campos básicos
        existing.setName(dto.getName());
        existing.setAddress(dto.getAddress());
        existing.setPhone(dto.getPhone());
        existing.setTaxId(dto.getTaxId());
        existing.setExpirationDate(dto.getExpirationDate());

        // CAMPOS PARA EL TICKET (Los que usará Silvia)
        existing.setEmail(dto.getEmail());
        existing.setTicketMessage(dto.getTicketMessage());
        existing.setLogoUrl(dto.getLogoUrl());

        return convertToDTO(companyRepository.save(existing));
    }

    @Override
    @Transactional
    public void deleteCompany(Long id) {
        Company company = companyRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada."));
        companyRepository.delete(company);
    }

    private CompanyDTO convertToDTO(Company entity) {
        CompanyDTO dto = new CompanyDTO();
        dto.setId(entity.getId());
        dto.setName(entity.getName());
        dto.setTaxId(entity.getTaxId());
        dto.setAddress(entity.getAddress());
        dto.setPhone(entity.getPhone());
        dto.setEmail(entity.getEmail()); // <--- Agregado
        dto.setTicketMessage(entity.getTicketMessage()); // <--- Agregado
        dto.setLogoUrl(entity.getLogoUrl()); // <--- Agregado
        dto.setExpirationDate(entity.getExpirationDate());

        boolean isExpired = entity.getExpirationDate() != null &&
                entity.getExpirationDate().isBefore(LocalDate.now());

        dto.setActive(entity.getActive() && !isExpired);
        return dto;
    }
}