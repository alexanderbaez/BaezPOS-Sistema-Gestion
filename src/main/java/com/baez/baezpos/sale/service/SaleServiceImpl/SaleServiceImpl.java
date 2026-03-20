package com.baez.baezpos.sale.service.SaleServiceImpl;

import com.baez.baezpos.company.entity.Company;
import com.baez.baezpos.company.repository.CompanyRepository;
import com.baez.baezpos.customer.entities.Customer;
import com.baez.baezpos.customer.repository.CustomerRepository;
import com.baez.baezpos.customer.service.CustomerService;
import com.baez.baezpos.expense.repository.ExpenseRepository;
import com.baez.baezpos.inventory.entity.MovementType;
import com.baez.baezpos.inventory.service.InventoryService.InventoryService;
import com.baez.baezpos.product.entity.Product;
import com.baez.baezpos.product.repository.ProductRepository;
import com.baez.baezpos.sale.dto.*;
import com.baez.baezpos.sale.entity.Sale;
import com.baez.baezpos.sale.entity.SaleItem;
import com.baez.baezpos.sale.repository.SaleRepository;
import com.baez.baezpos.sale.service.SaleService.SaleService;
import com.baez.baezpos.shared.exception.BadRequestException;
import com.baez.baezpos.shared.exception.ResourceNotFoundException;
import com.baez.baezpos.user.entity.User;
import com.baez.baezpos.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleServiceImpl implements SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final InventoryService inventoryService;
    private final UserRepository userRepository;
    private final CompanyRepository companyRepository;
    private final ExpenseRepository expenseRepository;
    private final CustomerService customerService;
    private final CustomerRepository customerRepository;


    @Override
    @Transactional(rollbackFor = Exception.class)
    public SaleResponseDTO createSale(SaleRequestDTO saleDTO, Long companyId, Long userId) {

        // 1. Cargar contexto
        Company company = companyRepository.findById(companyId)
                .orElseThrow(() -> new RuntimeException("Empresa no encontrada"));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        // 2. Pre-Validación de Stock
        for (SaleItemRequestDTO itemDTO : saleDTO.items()) {
            Product p = productRepository.findById(itemDTO.productId())
                    .filter(prod -> prod.getCompany().getId().equals(companyId))
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + itemDTO.productId()));

            if (p.getStock() < itemDTO.quantity()) {
                throw new RuntimeException("Stock insuficiente para: " + p.getName() + " (Disponible: " + p.getStock() + ")");
            }
        }

        // 3. Crear cabecera de la venta
        Sale sale = Sale.builder()
                .company(company)
                .user(user)
                .saleDate(LocalDateTime.now())
                .items(new ArrayList<>())
                .discount(saleDTO.discount() != null ? saleDTO.discount() : BigDecimal.ZERO)
                .paymentMethod(saleDTO.paymentMethod())
                .build();

        BigDecimal subtotalAcumulado = BigDecimal.ZERO;

        // 4. Construir los items de la venta
        for (SaleItemRequestDTO itemDTO : saleDTO.items()) {
            Product product = productRepository.findById(itemDTO.productId())
                    .orElseThrow(() -> new RuntimeException("Error interno: Producto desapareció"));

            BigDecimal precioVenta = (itemDTO.price() != null) ? itemDTO.price() : product.getPrice();
            BigDecimal subtotalItem = precioVenta.multiply(BigDecimal.valueOf(itemDTO.quantity()));

            SaleItem item = SaleItem.builder()
                    .sale(sale)
                    .product(product)
                    .quantity(itemDTO.quantity())
                    .price(precioVenta)
                    .cost(product.getCost())
                    .subtotal(subtotalItem)
                    .build();

            sale.getItems().add(item);
            subtotalAcumulado = subtotalAcumulado.add(subtotalItem);
        }

        // 5. Calcular total final y persistir la Venta
        BigDecimal totalFinal = subtotalAcumulado.subtract(sale.getDiscount());
        sale.setTotal(totalFinal.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : totalFinal);

        Sale savedSale = saleRepository.save(sale);

        // 6. Registrar en el Kardex y descontar stock
        for (SaleItem item : savedSale.getItems()) {
            inventoryService.registerMovement(
                    item.getProduct().getId(),
                    item.getQuantity(),
                    MovementType.SALE,
                    "Venta #" + savedSale.getId(),
                    companyId
            );
        }

        // --- NUEVA LÓGICA DE LIBRETA CON VALIDACIÓN DE LÍMITE ---
        if ("CUENTA_CORRIENTE".equals(saleDTO.paymentMethod())) {
            if (saleDTO.customerId() == null) {
                throw new RuntimeException("Debe seleccionar un cliente para ventas en cuenta corriente");
            }

            // 1. Buscamos al cliente (Usando el repositorio de clientes)
            Customer customer = customerRepository.findById(saleDTO.customerId())
                    .filter(c -> c.getCompany().getId().equals(companyId))
                    .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

            // 2. Calculamos el nuevo saldo proyectado
            BigDecimal nuevoSaldo = customer.getCurrentBalance().add(savedSale.getTotal());

            // 3. VALIDACIÓN DE LÍMITE: Si tiene límite y lo supera, tiramos error (esto hace rollback de la venta)
            if (customer.getCreditLimit() != null && nuevoSaldo.compareTo(customer.getCreditLimit()) > 0) {
                throw new RuntimeException("Límite de crédito excedido. Saldo actual: " +
                        customer.getCurrentBalance() + " | Límite: " + customer.getCreditLimit());
            }

            // 4. Si pasó la validación, impactamos el saldo
            customerService.updateBalance(
                    customer.getId(),
                    savedSale.getTotal(),
                    "DEBITO",
                    "Venta en libreta #" + savedSale.getId(),
                    savedSale,
                    company
            );
        }

        log.info("Venta exitosa ID: {} - Empresa: {}", savedSale.getId(), company.getName());
        return mapToResponseDTO(savedSale);
    }

    private SaleResponseDTO mapToResponseDTO(Sale sale) {
        List<SaleItemResponseDTO> itemDTOs = sale.getItems().stream()
                .map(item -> new SaleItemResponseDTO(
                        item.getProduct().getName(),
                        item.getQuantity(),
                        item.getPrice(),
                        item.getSubtotal()
                )).toList();

        return new SaleResponseDTO(
                sale.getId(),
                sale.getSaleDate(),
                sale.getTotal(),
                sale.getDiscount(),
                sale.getPaymentMethod(), // <--- ¡AGREGÁ ESTO ACÁ!
                sale.getUser().getName(),
                sale.getCompany().getName(),
                sale.getCompany().getTaxId(),
                sale.getCompany().getAddress(),
                itemDTOs
        );
    }

    @Override
    @Transactional(readOnly = true)
    public SaleResponseDTO getSaleById(Long id, Long companyId) {
        Sale sale = saleRepository.findById(id)
                .filter(s -> s.getCompany().getId().equals(companyId))
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));
        return mapToResponseDTO(sale);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SaleResponseDTO> getAllSalesByCompany(Long companyId) {
        return saleRepository.findByCompanyId(companyId).stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BoxReportDTO getBoxReport(Long companyId) {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime startOfDay = now.toLocalDate().atStartOfDay();
        LocalDateTime startOfMonth = now.withDayOfMonth(1).toLocalDate().atStartOfDay();
        LocalDateTime startOfLastMonth = now.minusMonths(1).withDayOfMonth(1).toLocalDate().atStartOfDay();
        LocalDateTime endOfLastMonth = startOfMonth.minusSeconds(1);

        // 1. Cálculos de Hoy
        BigDecimal tSales = saleRepository.sumTotalByCompanyAndDateRange(companyId, startOfDay, now);
        BigDecimal tCash = saleRepository.sumTotalCash(companyId, startOfDay, now);
        BigDecimal tTransfer = saleRepository.sumTotalTransfer(companyId, startOfDay, now);

        // --- LÓGICA DE LA LIBRETA (Dato #4 del DTO) ---
        // Si todavía no tenés el método en el repo, dejalo en ZERO para que no de error
        BigDecimal tCredit = saleRepository.sumTotalCredit(companyId, startOfDay, now);

        // 2. Ganancias y Gastos
        BigDecimal tProfit = saleRepository.sumNetProfitByCompanyAndDateRange(companyId, startOfDay, now);
        BigDecimal tExpenses = expenseRepository.sumTotalByCompanyAndDateRange(companyId, startOfDay, now);

        // 3. Totales Mensuales
        BigDecimal mSales = saleRepository.sumTotalByCompanyAndDateRange(companyId, startOfMonth, now);
        BigDecimal mProfit = saleRepository.sumNetProfitByCompanyAndDateRange(companyId, startOfMonth, now);
        BigDecimal lMonthSales = saleRepository.sumTotalByCompanyAndDateRange(companyId, startOfLastMonth, endOfLastMonth);

        // 4. Normalización (Evitar Nulls)
        BigDecimal sales = (tSales != null) ? tSales : BigDecimal.ZERO;
        BigDecimal cash = (tCash != null) ? tCash : BigDecimal.ZERO;
        BigDecimal transfer = (tTransfer != null) ? tTransfer : BigDecimal.ZERO;
        BigDecimal credit = (tCredit != null) ? tCredit : BigDecimal.ZERO; // <--- NUEVO
        BigDecimal profit = (tProfit != null) ? tProfit : BigDecimal.ZERO;
        BigDecimal expenses = (tExpenses != null) ? tExpenses : BigDecimal.ZERO;

        // Balance real: Plata física (Efectivo + Transf) - Gastos
        BigDecimal finalBalance = cash.add(transfer).subtract(expenses);

        long todayCount = saleRepository.countByCompanyAndDateRange(companyId, startOfDay, now);

        // 5. RETORNO (DEBEN SER 11 CAMPOS EN ESTE ORDEN)
        return new BoxReportDTO(
                sales,                                         // 1. todaySales
                cash,                                          // 2. cashSales
                transfer,                                      // 3. transferSales
                credit,                                        // 4. creditSales (EL QUE FALTABA)
                profit,                                        // 5. todayProfit
                expenses,                                      // 6. todayExpenses
                finalBalance,                                  // 7. finalBalance
                (mSales != null) ? mSales : BigDecimal.ZERO,   // 8. monthSales
                (mProfit != null) ? mProfit : BigDecimal.ZERO, // 9. monthProfit
                (lMonthSales != null) ? lMonthSales : BigDecimal.ZERO, // 10. lastMonthSales
                todayCount                                     // 11. todayCount (Como es long, va directo)
        );
    }

    @Override
    public List<ChartDataDTO> getSalesChartData(Long companyId) {
        LocalDate today = LocalDate.now();
        // 1. Creamos un mapa con los últimos 7 días en 0
        Map<LocalDate, BigDecimal> last7Days = new LinkedHashMap<>();
        for (int i = 6; i >= 0; i--) {
            last7Days.put(today.minusDays(i), BigDecimal.ZERO);
        }

        // 2. Traemos los datos reales de la DB
        LocalDateTime startDate = today.minusDays(6).atStartOfDay();
        List<Object[]> rawData = saleRepository.getSalesChartData(companyId, startDate);

        // 3. Sobrescribimos el 0 con el valor real
        for (Object[] row : rawData) {
            LocalDate date = ((java.sql.Date) row[0]).toLocalDate();
            last7Days.put(date, (BigDecimal) row[1]);
        }

        // 4. Convertimos a la lista de DTOs
        return last7Days.entrySet().stream()
                .map(e -> new ChartDataDTO(e.getKey().toString(), e.getValue()))
                .toList();
    }

    @Transactional
    public void cancelSale(Long saleId, Long companyId) {
        Sale sale = saleRepository.findByIdAndCompanyId(saleId, companyId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));

        if (Boolean.TRUE.equals(sale.getCanceled())) {
            // Al ser nuestra propia RuntimeException, ya no pide el 'throws' en la firma del método
            throw new BadRequestException("La venta ya se encuentra anulada.");
        }

        sale.setCanceled(true);

        // Devolución de stock
        for (SaleItem item : sale.getItems()) {
            Product product = item.getProduct();
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }

        saleRepository.save(sale);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SaleResponseDTO> getSalesByDateRange(LocalDate desde, LocalDate hasta, Long companyId) {
        // IMPORTANTE: Ajustar el rango horario
        LocalDateTime start = desde.atStartOfDay(); // 00:00:00
        LocalDateTime end = hasta.atTime(LocalTime.MAX); // 23:59:59.999

        // Llamada al repository
        List<Sale> sales = saleRepository.findByCompanyIdAndSaleDateBetweenOrderBySaleDateDesc(
                companyId, start, end
        );

        // Convertimos las entidades a DTOs (usando tu lógica de conversión)
        return sales.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    private SaleResponseDTO convertToDTO(Sale sale) {
        // 1. Mapeamos los items primero (si es necesario)
        List<SaleItemResponseDTO> itemDtos = sale.getItems().stream()
                .map(item -> new SaleItemResponseDTO(
                        item.getProduct().getName(),      // 1. String (productName)
                        item.getQuantity().intValue(),    // 2. Integer (quantity) <--- Convertimos a Integer aquí
                        item.getPrice(),                 // 3. BigDecimal (price)
                        item.getSubtotal()               // 4. BigDecimal (subtotal)
                )).collect(Collectors.toList());

        // 2. Creamos el Record usando SU ÚNICO CONSTRUCTOR
        // Debes pasarle los parámetros en el orden exacto que dice el error de compilación
        return new SaleResponseDTO(
                sale.getId(),                               // 1. Long
                sale.getSaleDate(),                         // 2. LocalDateTime
                sale.getTotal(),                            // 3. BigDecimal
                sale.getDiscount() != null ? sale.getDiscount() : java.math.BigDecimal.ZERO, // 4. BigDecimal (Descuento)
                sale.getPaymentMethod(),                    // 5. String
                sale.getUser().getName(),                   // 6. String (Usuario)
                sale.getCanceled() ? "ANULADA" : "ACTIVA", // 7. String (Estado)
                "",                                         // 8. String (Extra/Campo vacío)
                "",                                         // 9. String (Extra/Campo vacío)
                itemDtos                                    // 10. List<SaleItemResponseDTO>
        );
    }
}