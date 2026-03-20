package com.baez.baezpos.product.service.Impl;

import com.baez.baezpos.company.repository.CompanyRepository;
import com.baez.baezpos.product.dto.ProductRequestDTO;
import com.baez.baezpos.product.dto.ProductResponseDTO;
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
    private final CompanyRepository companyRepository;

    @Override
    @Transactional
    public ProductResponseDTO createProduct(ProductRequestDTO dto, Long companyId) {
        // 1. Buscamos el producto existente por BARCODE y COMPANY (sin filtrar por active)
        Optional<Product> existingProduct = productRepository.findByBarcodeAndCompanyId(dto.barcode(), companyId);

        if (existingProduct.isPresent()) {
            Product productEncontrado = existingProduct.get(); // <--- Este objeto YA TIENE EL ID

            if (productEncontrado.getActive()) {
                throw new RuntimeException("El producto ya está activo en el sistema.");
            }

            // 2. REANIMACIÓN: Actualizamos los datos del objeto que ya tiene ID
            var category = categoryRepository.findById(dto.categoryId())
                    .filter(c -> c.getCompany().getId().equals(companyId))
                    .orElseThrow(() -> new RuntimeException("Categoría no válida"));

            productEncontrado.setName(dto.name());
            productEncontrado.setDescription(dto.description());
            productEncontrado.setCost(dto.cost());
            productEncontrado.setPrice(dto.price());
            productEncontrado.setStock(dto.stock());
            productEncontrado.setMinStock(dto.minStock());
            productEncontrado.setCategory(category);
            productEncontrado.setActive(true); // <--- Lo activamos

            // Al usar save() sobre un objeto recuperado de la DB, Hibernate hace un UPDATE
            return mapToResponseDTO(productRepository.save(productEncontrado));
        }

        // 3. Solo si no existía absolutamente nada, usamos el Builder para un nuevo INSERT
        var category = categoryRepository.findById(dto.categoryId())
                .filter(c -> c.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Categoría no válida"));

        var company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));

        Product nuevoProduct = Product.builder()
                .name(dto.name())
                .description(dto.description())
                .barcode(dto.barcode())
                .cost(dto.cost())
                .price(dto.price())
                .stock(dto.stock())
                .minStock(dto.minStock())
                .category(category)
                .company(company)
                .active(true)
                .build();

        return mapToResponseDTO(productRepository.save(nuevoProduct));
    }

    @Override
    public List<ProductResponseDTO> getAllProducts(Long companyId) {
        // Usamos el método que filtra por active=true
        return productRepository.findByCompanyIdAndActiveTrue(companyId).stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    public ProductResponseDTO getProductById(Long id, Long companyId) {
        return productRepository.findById(id)
                .filter(p -> p.getCompany().getId().equals(companyId))
                .map(this::mapToResponseDTO)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
    }

    @Override
    @Transactional
    public ProductResponseDTO updateProduct(Long id, ProductRequestDTO dto, Long companyId) {
        Product product = productRepository.findById(id)
                .filter(p -> p.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        var category = categoryRepository.findById(dto.categoryId())
                .filter(c -> c.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Categoría no válida"));

        product.setName(dto.name());
        product.setDescription(dto.description());
        product.setBarcode(dto.barcode());
        product.setCost(dto.cost());
        product.setPrice(dto.price());
        product.setStock(dto.stock());
        product.setMinStock(dto.minStock());
        product.setCategory(category);

        return mapToResponseDTO(productRepository.save(product));
    }

    @Override
    @Transactional
    public void deleteProduct(Long id, Long companyId) {
        Product product = productRepository.findById(id)
                .filter(p -> p.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        // BORRADO LÓGICO
        product.setActive(false);
        productRepository.save(product);
    }

    @Override
    public Optional<ProductResponseDTO> getByBarcode(String barcode, Long companyId) {
        return productRepository.findByBarcodeAndCompanyId(barcode, companyId)
                .map(this::mapToResponseDTO);
    }

    private ProductResponseDTO mapToResponseDTO(Product p) {
        return new ProductResponseDTO(
                p.getId(),
                p.getName(),
                p.getCategory().getName(),
                p.getCategory().getId(), // Mapeamos el ID
                p.getPrice(),
                p.getCost(),            // Mapeamos el costo
                p.getStock(),
                p.getMinStock(),        // Mapeamos el mínimo
                p.getBarcode()
        );
    }

    @Override
    public List<ProductResponseDTO> getDeletedProducts(Long companyId) {
        return productRepository.findByCompanyIdAndActiveFalse(companyId).stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    @Transactional
    public ProductResponseDTO activateProduct(Long id, Long companyId) {
        // Buscamos el producto sin importar si active es false
        Product product = productRepository.findById(id)
                .filter(p -> p.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));

        product.setActive(true);
        return mapToResponseDTO(productRepository.save(product));
    }
}