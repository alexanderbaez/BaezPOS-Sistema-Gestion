package com.baez.baezpos.product.repository;

import com.baez.baezpos.product.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

// CategoryRepository.java
public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByNameAndCompanyId(String name, Long companyId);
    List<Category> findByCompanyIdAndActiveTrue(Long companyId);

    // Nuevo: Para la "Papelera" de categorías
    List<Category> findByCompanyIdAndActiveFalse(Long companyId);
}