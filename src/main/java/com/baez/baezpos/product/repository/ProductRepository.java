package com.baez.baezpos.product.repository;

import com.baez.baezpos.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

// ProductRepository.java
public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByBarcodeAndCompanyId(String barcode, Long companyId);
    List<Product> findByCompanyIdAndActiveTrue(Long companyId);

    // Para ver los productos eliminados
    List<Product> findByCompanyIdAndActiveFalse(Long companyId);
}
