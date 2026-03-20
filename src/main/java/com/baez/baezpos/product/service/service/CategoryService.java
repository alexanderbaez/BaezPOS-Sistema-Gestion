package com.baez.baezpos.product.service.service;

import com.baez.baezpos.product.dto.CategoryRequestDTO;
import com.baez.baezpos.product.dto.CategoryResponseDTO;
import java.util.List;

public interface CategoryService {
    CategoryResponseDTO createCategory(CategoryRequestDTO dto, Long companyId);
    CategoryResponseDTO getCategoryById(Long id, Long companyId);
    List<CategoryResponseDTO> getAllCategories(Long companyId);
    CategoryResponseDTO updateCategory(Long id, CategoryRequestDTO dto, Long companyId);
    void deleteCategory(Long id, Long companyId);
    CategoryResponseDTO activateCategory(Long id, Long companyId);
    List<CategoryResponseDTO> getDeletedCategories(Long companyId);
}