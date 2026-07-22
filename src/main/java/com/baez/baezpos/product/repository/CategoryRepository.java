package com.baez.baezpos.product.repository;

import com.baez.baezpos.product.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CategoryRepository extends JpaRepository<Category, Long> {
    Optional<Category> findByName(String name);
    List<Category> findByActiveTrue();
    List<Category> findByActiveFalse();
}