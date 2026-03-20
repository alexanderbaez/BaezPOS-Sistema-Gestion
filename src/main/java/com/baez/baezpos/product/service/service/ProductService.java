package com.baez.baezpos.product.service.service;

import com.baez.baezpos.product.dto.ProductRequestDTO;
import com.baez.baezpos.product.dto.ProductResponseDTO;
import com.baez.baezpos.product.entity.Product;
import java.util.List;
import java.util.Optional;

public interface ProductService {
    ProductResponseDTO createProduct(ProductRequestDTO dto, Long companyId);
    ProductResponseDTO getProductById(Long id, Long companyId);
    List<ProductResponseDTO> getAllProducts(Long companyId);
    ProductResponseDTO updateProduct(Long id, ProductRequestDTO dto, Long companyId);
    void deleteProduct(Long id, Long companyId);
    Optional<ProductResponseDTO> getByBarcode(String barcode, Long companyId);
    ProductResponseDTO activateProduct(Long id, Long companyId);
    List<ProductResponseDTO> getDeletedProducts(Long companyId);
}