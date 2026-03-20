package com.baez.baezpos.product.service.Impl;

import com.baez.baezpos.company.repository.CompanyRepository;
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
    private final CompanyRepository companyRepository;

    @Override
    @Transactional
    public CategoryResponseDTO createCategory(CategoryRequestDTO dto, Long companyId) {
        // 1. Buscamos si el nombre ya existe (sin importar el estado de 'active')
        Optional<Category> existing = categoryRepository.findByNameAndCompanyId(dto.name(), companyId);

        if (existing.isPresent()) {
            Category category = existing.get();
            if (category.getActive()) {
                throw new RuntimeException("Ya existe una categoría activa con ese nombre");
            } else {
                // REANIMACIÓN: Existe pero estaba inactiva
                category.setActive(true);
                category.setDescription(dto.description()); // Actualizamos por si cambió
                return mapToResponseDTO(categoryRepository.save(category));
            }
        }

        // 2. Creación normal si no existía nada
        var company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        Category newCategory = Category.builder()
                .name(dto.name())
                .description(dto.description())
                .company(company)
                .active(true)
                .build();

        return mapToResponseDTO(categoryRepository.save(newCategory));
    }

    @Override
    public List<CategoryResponseDTO> getAllCategories(Long companyId) {
        // IMPORTANTE: Aquí usamos el método filtrado para no ensuciar el frontend
        return categoryRepository.findByCompanyIdAndActiveTrue(companyId).stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    public CategoryResponseDTO getCategoryById(Long id, Long companyId) {
        return categoryRepository.findById(id)
                .filter(c -> c.getCompany().getId().equals(companyId))
                .map(this::mapToResponseDTO)
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));
    }

    @Override
    @Transactional
    public CategoryResponseDTO updateCategory(Long id, CategoryRequestDTO dto, Long companyId) {
        Category category = categoryRepository.findById(id)
                .filter(c -> c.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        category.setName(dto.name());
        category.setDescription(dto.description());

        return mapToResponseDTO(categoryRepository.save(category));
    }

    @Override
    @Transactional
    public void deleteCategory(Long id, Long companyId) {
        Category category = categoryRepository.findById(id)
                .filter(c -> c.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        // El @SQLDelete se encargará del borrado lógico
        categoryRepository.delete(category);
    }

    private CategoryResponseDTO mapToResponseDTO(Category c) {
        return new CategoryResponseDTO(c.getId(), c.getName(), c.getDescription());
    }

    // CategoryServiceImpl.java

    @Override
    public List<CategoryResponseDTO> getDeletedCategories(Long companyId) {
        return categoryRepository.findByCompanyIdAndActiveFalse(companyId).stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    @Transactional
    public CategoryResponseDTO activateCategory(Long id, Long companyId) {
        Category category = categoryRepository.findById(id)
                .filter(c -> c.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Categoría no encontrada"));

        category.setActive(true);
        return mapToResponseDTO(categoryRepository.save(category));
    }
}