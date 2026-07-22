package com.baez.baezpos.product.service.Impl;

import com.baez.baezpos.product.dto.CategoryRequestDTO;
import com.baez.baezpos.product.dto.CategoryResponseDTO;
import com.baez.baezpos.product.entity.Category;
import com.baez.baezpos.product.repository.CategoryRepository;
import com.baez.baezpos.product.service.service.CategoryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class CategoryServiceImpl implements CategoryService {

    private final CategoryRepository categoryRepository;

    @Override
    @Transactional
    public CategoryResponseDTO createCategory(CategoryRequestDTO dto) {
        // 1. Buscamos si el nombre ya existe de forma global en la DB local
        Optional<Category> existing = categoryRepository.findByName(dto.name());

        if (existing.isPresent()) {
            Category category = existing.get();
            if (category.getActive()) {
                throw new RuntimeException("Ya existe una categoría activa con ese nombre");
            } else {
                // Reanimación de categoría borrada
                category.setActive(true);
                category.setDescription(dto.description());
                return mapToResponseDTO(categoryRepository.save(category));
            }
        }

        // 2. Creación normal sin Company
        Category newCategory = Category.builder()
                .name(dto.name())
                .description(dto.description())
                .active(true)
                .build();

        return mapToResponseDTO(categoryRepository.save(newCategory));
    }

    @Override
    public List<CategoryResponseDTO> getAllCategories() {
        return categoryRepository.findByActiveTrue().stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    public CategoryResponseDTO getCategoryById(Long id) {
        return categoryRepository.findById(id)
                .map(this::mapToResponseDTO)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
    }

    @Override
    @Transactional
    public CategoryResponseDTO updateCategory(Long id, CategoryRequestDTO dto) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        category.setName(dto.name());
        category.setDescription(dto.description());

        return mapToResponseDTO(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public void deleteCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        // Aplicamos borrado lógico (active = false)
        category.setActive(false);
        categoryRepository.save(category);
    }

    @Override
    public List<CategoryResponseDTO> getDeletedCategories() {
        return categoryRepository.findByActiveFalse().stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    @Transactional
    public CategoryResponseDTO activateCategory(Long id) {
        Category category = categoryRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        category.setActive(true);
        return mapToResponseDTO(categoryRepository.save(category));
    }

    private CategoryResponseDTO mapToResponseDTO(Category c) {
        return new CategoryResponseDTO(c.getId(), c.getName(), c.getDescription());
    }
}