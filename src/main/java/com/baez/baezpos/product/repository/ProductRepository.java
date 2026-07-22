package com.baez.baezpos.product.repository;

import com.baez.baezpos.product.entity.Product;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ProductRepository extends JpaRepository<Product, Long> {
    Optional<Product> findByBarcode(String barcode);

    // Traemos el producto Y su categoría de un solo viaje a la DB
    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.active = true")
    List<Product> findByActiveTrueWithCategory();

    @Query("SELECT p FROM Product p LEFT JOIN FETCH p.category WHERE p.active = false")
    List<Product> findByActiveFalseWithCategory();
}
