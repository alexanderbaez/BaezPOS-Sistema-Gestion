package com.baez.baezpos.company.repository;

import com.baez.baezpos.company.entity.Company;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CompanyRepository extends JpaRepository<Company, Long> {
    boolean existsByTaxId(String taxId);
    Optional<Company> findByTaxId(String taxId);
    Optional<Company> findByEmail(String email);
    // ESTO ES LO QUE ESTÁ FALLANDO
    @Query("SELECT c FROM Company c WHERE c.active = true")
    List<Company> findAllActiveCompanies();
}