package com.baez.baezpos.product.service.Impl;

import com.baez.baezpos.product.dto.ProductRequestDTO;
import com.baez.baezpos.product.dto.ProductResponseDTO;
import com.baez.baezpos.product.entity.Category;
import com.baez.baezpos.product.entity.Product;
import com.baez.baezpos.product.repository.CategoryRepository;
import com.baez.baezpos.product.repository.ProductRepository;
import com.baez.baezpos.product.service.service.ProductService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ProductServiceImpl implements ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    @Override
    @Transactional
    public ProductResponseDTO createProduct(ProductRequestDTO dto) {
        // 1. Buscamos si ya existe por código de barras (solo si el código no está vacío)
        Optional<Product> existingProduct = Optional.empty();
        if (dto.barcode() != null && !dto.barcode().trim().isEmpty()) {
            existingProduct = productRepository.findByBarcode(dto.barcode());
        }

        if (existingProduct.isPresent()) {
            Product productEncontrado = existingProduct.get();

            if (productEncontrado.getActive()) {
                throw new RuntimeException("El producto ya está activo en el sistema.");
            }

            // 2. REANIMACIÓN: Actualizamos el producto borrado anteriormente
            var category = categoryRepository.findById(dto.categoryId())
                    .orElseThrow(() -> new RuntimeException("Categoría no válida"));

            updateProductData(productEncontrado, dto, category);
            productEncontrado.setActive(true);

            return mapToResponseDTO(productRepository.save(productEncontrado));
        }

        // 3. Crear nuevo Producto
        var category = categoryRepository.findById(dto.categoryId())
                .orElseThrow(() -> new RuntimeException("Categoría no válida"));

        Product nuevoProduct = Product.builder()
                .name(dto.name())
                .description(dto.description())
                .barcode(dto.barcode())
                .cost(dto.cost())
                .price(dto.price())
                .stock(dto.stock())
                .minStock(dto.minStock())
                .category(category)
                .active(true)
                .build();

        return mapToResponseDTO(productRepository.save(nuevoProduct));
    }

    @Override
    @Transactional(readOnly = true)
    public List<ProductResponseDTO> getAllProducts() {
        // Usamos el nuevo método con JOIN FETCH
        return productRepository.findByActiveTrueWithCategory().stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    public ProductResponseDTO getProductById(Long id) {
        return productRepository.findById(id)
                .map(this::mapToResponseDTO)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    @Override
    @Transactional
    public ProductResponseDTO updateProduct(Long id, ProductRequestDTO dto) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        var category = categoryRepository.findById(dto.categoryId())
                .orElseThrow(() -> new RuntimeException("Categoría no válida"));

        updateProductData(product, dto, category);
        return mapToResponseDTO(productRepository.save(product));
    }

    // Método auxiliar para evitar repetir código
    private void updateProductData(Product p, ProductRequestDTO dto, Category cat) {
        p.setName(dto.name());
        p.setDescription(dto.description());
        p.setBarcode(dto.barcode());
        p.setCost(dto.cost());
        p.setPrice(dto.price());
        p.setStock(dto.stock());
        p.setMinStock(dto.minStock());
        p.setCategory(cat);
    }

    @Override
    @Transactional
    public void deleteProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        product.setActive(false);
        productRepository.save(product);
    }

    @Override
    public Optional<ProductResponseDTO> getByBarcode(String barcode) {
        return productRepository.findByBarcode(barcode).map(this::mapToResponseDTO);
    }

    @Override
    @Transactional(readOnly = true) // Agregado para getDeleted
    public List<ProductResponseDTO> getDeletedProducts() {
        return productRepository.findByActiveFalseWithCategory().stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    @Transactional
    public ProductResponseDTO activateProduct(Long id) {
        Product product = productRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
        product.setActive(true);
        return mapToResponseDTO(productRepository.save(product));
    }

    // FIX DE SEGURIDAD EN EL MAPEADOR
    private ProductResponseDTO mapToResponseDTO(Product p) {
        // Verificamos nulos para evitar NullPointerException si un producto no tiene categoría
        String catName = (p.getCategory() != null) ? p.getCategory().getName() : "Sin Categoría";
        Long catId = (p.getCategory() != null) ? p.getCategory().getId() : null;

        return new ProductResponseDTO(
                p.getId(),
                p.getName(),
                catName,
                catId,
                p.getPrice(),
                p.getCost(),
                p.getStock(),
                p.getMinStock(),
                p.getBarcode()
        );
    }
}