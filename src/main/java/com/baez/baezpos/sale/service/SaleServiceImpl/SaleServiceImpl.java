package com.baez.baezpos.sale.service.SaleServiceImpl;

import com.baez.baezpos.customer.entities.Customer;
import com.baez.baezpos.customer.repository.CustomerMovementRepository;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleServiceImpl implements SaleService {

    private final SaleRepository saleRepository;
    private final ProductRepository productRepository;
    private final InventoryService inventoryService;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final CustomerService customerService;
    private final CustomerRepository customerRepository;
    private final CustomerMovementRepository customerMovementRepository;

    // Parametrización de los datos de la empresa desde application.properties (con valores fallback)
    @Value("${app.company.name:BÁEZ POS}")
    private String companyName;

    @Value("${app.company.cuit:20-00000000-0}")
    private String companyCuit;

    @Value("${app.company.address:Dirección Comercial}")
    private String companyAddress;

    @Override
    @Transactional(rollbackFor = Exception.class)
    public SaleResponseDTO createSale(SaleRequestDTO saleDTO, Long userId) {

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Usuario no encontrado"));

        BigDecimal recargo = saleDTO.surcharge() != null ? saleDTO.surcharge() : BigDecimal.ZERO;
        BigDecimal porcentajeRecargo = saleDTO.surchargeRate() != null ? saleDTO.surchargeRate() : BigDecimal.ZERO;
        BigDecimal descuento = saleDTO.discount() != null ? saleDTO.discount() : BigDecimal.ZERO;

        // 1. Construir entidad Sale básica con recargos
        Sale sale = Sale.builder()
                .user(user)
                .saleDate(LocalDateTime.now())
                .items(new ArrayList<>())
                .discount(descuento)
                .surcharge(recargo)
                .surchargeRate(porcentajeRecargo)
                .paymentMethod(saleDTO.paymentMethod())
                .canceled(false)
                .build();

        // LÓGICA DE SELECCIÓN FISCAL
        if (Boolean.TRUE.equals(saleDTO.isFiscal())) {
            sale.setTipoComprobante("FACTURA C");
            sale.setCae("76543210987654");
            sale.setCaeVto(LocalDate.now().plusDays(10).toString());
        } else {
            sale.setTipoComprobante("TICKET INTERNO");
        }

        BigDecimal subtotalAcumulado = BigDecimal.ZERO;

        // 2. Procesar Items
        for (SaleItemRequestDTO itemDTO : saleDTO.items()) {
            Product product = productRepository.findById(itemDTO.productId())
                    .orElseThrow(() -> new RuntimeException("Producto no encontrado: " + itemDTO.productId()));

            if (product.getStock() < itemDTO.quantity()) {
                throw new RuntimeException("Stock insuficiente para: " + product.getName());
            }

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

        // 3. Calcular total final: (Subtotal + Recargo) - Descuento
        BigDecimal totalFinal = subtotalAcumulado.add(recargo).subtract(descuento);
        sale.setTotal(totalFinal.compareTo(BigDecimal.ZERO) < 0 ? BigDecimal.ZERO : totalFinal);

        // Guardar venta y generar número de comprobante
        Sale savedSale = saleRepository.save(sale);
        savedSale.setNroComprobante(String.format("00001-%08d", savedSale.getId()));
        savedSale = saleRepository.save(savedSale);

        // 4. Actualizar Stock y registrar Movimiento
        for (SaleItem item : savedSale.getItems()) {
            inventoryService.registerMovement(
                    item.getProduct().getId(),
                    item.getQuantity(),
                    MovementType.SALE,
                    "Venta #" + savedSale.getId()
            );
        }

        // 5. Gestión de Cuenta Corriente (Valida y actualiza balance usando el total con recargo)
        if ("CUENTA_CORRIENTE".equals(saleDTO.paymentMethod())) {
            handleCreditSale(saleDTO.customerId(), savedSale);
        }

        log.info("Venta procesada ID: {} - Total: ${} - Tipo: {}", savedSale.getId(), savedSale.getTotal(), savedSale.getTipoComprobante());
        return mapToResponseDTO(savedSale);
    }

    private void handleCreditSale(Long customerId, Sale savedSale) {
        if (customerId == null) {
            throw new RuntimeException("Debe seleccionar un cliente para cuenta corriente");
        }

        Customer customer = customerRepository.findById(customerId)
                .orElseThrow(() -> new RuntimeException("Cliente no encontrado"));

        BigDecimal nuevoSaldo = customer.getCurrentBalance().add(savedSale.getTotal());

        if (customer.getCreditLimit() != null && nuevoSaldo.compareTo(customer.getCreditLimit()) > 0) {
            throw new RuntimeException("Límite de crédito excedido.");
        }

        customerService.updateBalance(
                customer.getId(),
                savedSale.getTotal(),
                "DEBITO",
                "Venta en libreta #" + savedSale.getId(),
                savedSale,
                savedSale.getPaymentMethod()
        );
    }

    @Override
    @Transactional(readOnly = true)
    public SaleResponseDTO getSaleById(Long id) {
        Sale sale = saleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Venta no encontrada"));
        return mapToResponseDTO(sale);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SaleResponseDTO> getAllSales() {
        return saleRepository.findAll().stream()
                .sorted((s1, s2) -> s2.getSaleDate().compareTo(s1.getSaleDate()))
                .map(this::mapToResponseDTO)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public BoxReportDTO getBoxReport(String period) {
        LocalDateTime startToday = LocalDate.now().atStartOfDay();
        LocalDateTime endToday = LocalDate.now().atTime(23, 59, 59);
        LocalDateTime startMonth = LocalDate.now().withDayOfMonth(1).atStartOfDay();
        LocalDateTime endMonth = LocalDate.now().with(TemporalAdjusters.lastDayOfMonth()).atTime(23, 59, 59);

        List<Sale> monthlySales = saleRepository.findBySaleDateBetweenOrderBySaleDateDesc(startMonth, endMonth);

        // Variables para las ventas directas de HOY (Efectivo y Transferencia)
        BigDecimal vCash = BigDecimal.ZERO;
        BigDecimal vTransfer = BigDecimal.ZERO;
        BigDecimal tProfitDirecto = BigDecimal.ZERO; // Ganancia de ventas inmediatas (no fiadas)

        // Variables para las métricas del MES
        BigDecimal mSales = BigDecimal.ZERO;
        BigDecimal mCostAccumulator = BigDecimal.ZERO;
        long mCount = 0;

        for (Sale s : monthlySales) {
            if (s.getCanceled()) continue;

            mSales = mSales.add(s.getTotal());
            mCount++;

            for (SaleItem item : s.getItems()) {
                BigDecimal costUnit = item.getCost() != null ? item.getCost() : BigDecimal.ZERO;
                BigDecimal itemCostTotal = costUnit.multiply(BigDecimal.valueOf(item.getQuantity()));
                mCostAccumulator = mCostAccumulator.add(itemCostTotal);
            }

            // PROCESAMIENTO EXCLUSIVO DE HOY
            if (!s.getSaleDate().isBefore(startToday) && !s.getSaleDate().isAfter(endToday)) {
                // Acumulamos dinero e ingresos de ganancia SOLO si NO es Cuenta Corriente
                if ("EFECTIVO".equals(s.getPaymentMethod())) {
                    vCash = vCash.add(s.getTotal());
                } else if ("TRANSFERENCIA".equals(s.getPaymentMethod())) {
                    vTransfer = vTransfer.add(s.getTotal());
                }

                // Si la venta fue cobrada al instante (no fiada), su ganancia sí impacta hoy
                if (!"CUENTA_CORRIENTE".equals(s.getPaymentMethod())) {
                    for (SaleItem item : s.getItems()) {
                        BigDecimal costUnit = item.getCost() != null ? item.getCost() : BigDecimal.ZERO;
                        BigDecimal itemProfit = item.getSubtotal().subtract(costUnit.multiply(BigDecimal.valueOf(item.getQuantity())));
                        tProfitDirecto = tProfitDirecto.add(itemProfit);
                    }
                }
            }
        }

        // Obtener cobros de libreta ingresados HOY (en efectivo o transferencia)
        BigDecimal cobrosEfe = customerMovementRepository.sumPaymentsByMethod("EFECTIVO", startToday, endToday);
        if (cobrosEfe == null) cobrosEfe = BigDecimal.ZERO;

        BigDecimal cobrosTra = customerMovementRepository.sumPaymentsByMethod("TRANSFERENCIA", startToday, endToday);
        if (cobrosTra == null) cobrosTra = BigDecimal.ZERO;

        BigDecimal cobrosTotalHoy = cobrosEfe.add(cobrosTra);

        // CAJA Y RECAUDACIÓN REAL
        BigDecimal cashFinal = vCash.add(cobrosEfe);
        BigDecimal transferFinal = vTransfer.add(cobrosTra);

        // Ahora la Recaudación Total e Ingreso Real son exactamente IGUALES al flujo de caja
        BigDecimal recaudacionYBalanceReal = cashFinal.add(transferFinal);

        // CÁLCULO DE GANANCIA REAL DE COBROS DE LIBRETA:
        // Estimamos la ganancia del dinero cobrado de libretas en función del margen global promedio
        BigDecimal margenGananciaPromedio = BigDecimal.ZERO;
        if (mSales.compareTo(BigDecimal.ZERO) > 0) {
            BigDecimal mProfitTemp = mSales.subtract(mCostAccumulator);
            margenGananciaPromedio = mProfitTemp.divide(mSales, 4, java.math.RoundingMode.HALF_UP);
        }

        BigDecimal gananciaCobrosLibreta = cobrosTotalHoy.multiply(margenGananciaPromedio);

        // GANANCIA REAL TOTAL HOY = (Ganancia Ventas Contado Hoy) + (Ganancia sobre Cobros de Libreta Hoy)
        BigDecimal totalProfitReal = tProfitDirecto.add(gananciaCobrosLibreta);

        // MÉTICAS MENSUALES
        BigDecimal mProfit = mSales.subtract(mCostAccumulator);
        BigDecimal deudaTotalHistorica = customerRepository.sumAllBalances();

        return new BoxReportDTO(
                recaudacionYBalanceReal,  // totalSales (Ahora coincide con el balance real de dinero ingresado)
                cashFinal,                 // cashSales (Ventas Ef. + Cobros Libreta Ef.)
                transferFinal,             // transferSales (Ventas Transf. + Cobros Libreta Transf.)
                deudaTotalHistorica,       // tCredit (Deuda pendiente acumulada)
                totalProfitReal,           // totalProfit (Ganancia real ingresada hoy)
                recaudacionYBalanceReal,  // realBalance (Balance real en caja)
                mSales,                    // monthSales
                mCount,                    // monthOperations
                mProfit,                   // monthProfit
                mCostAccumulator           // monthReplacementCost
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<ChartDataDTO> getSalesChartData() {
        LocalDate today = LocalDate.now();
        Map<LocalDate, BigDecimal> last7Days = new LinkedHashMap<>();

        for (int i = 6; i >= 0; i--) {
            last7Days.put(today.minusDays(i), BigDecimal.ZERO);
        }

        LocalDateTime start = today.minusDays(6).atStartOfDay();
        LocalDateTime end = today.atTime(23, 59, 59);

        List<Sale> recentSales = saleRepository.findBySaleDateBetweenAndCanceledFalse(start, end);

        for (Sale sale : recentSales) {
            LocalDate localDate = sale.getSaleDate().toLocalDate();
            BigDecimal currentTotal = last7Days.getOrDefault(localDate, BigDecimal.ZERO);
            last7Days.put(localDate, currentTotal.add(sale.getTotal()));
        }

        return last7Days.entrySet().stream()
                .map(e -> new ChartDataDTO(e.getKey().toString(), e.getValue()))
                .toList();
    }

    @Override
    @Transactional
    public void cancelSale(Long saleId) {
        Sale sale = saleRepository.findById(saleId)
                .orElseThrow(() -> new ResourceNotFoundException("Venta no encontrada"));

        if (Boolean.TRUE.equals(sale.getCanceled())) {
            throw new BadRequestException("La venta ya se encuentra anulada.");
        }

        sale.setCanceled(true);

        for (SaleItem item : sale.getItems()) {
            Product product = item.getProduct();
            product.setStock(product.getStock() + item.getQuantity());
            productRepository.save(product);
        }

        saleRepository.save(sale);
    }

    @Override
    @Transactional(readOnly = true)
    public List<SaleResponseDTO> getSalesByDateRange(LocalDate desde, LocalDate hasta) {
        LocalDateTime start = desde.atStartOfDay();
        LocalDateTime end = hasta.atTime(LocalTime.MAX);

        // Optimización: Consulta filtrada directamente en Base de Datos (en vez de cargar todo a memoria con findAll)
        return saleRepository.findBySaleDateBetweenOrderBySaleDateDesc(start, end)
                .stream()
                .map(this::mapToResponseDTO)
                .toList();
    }

    // MAPEO A DTO: Utiliza variables parametrizadas y mapea recargos
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
                sale.getSurcharge(),
                sale.getSurchargeRate(),
                sale.getPaymentMethod(),
                sale.getUser().getName(),
                this.companyName,
                this.companyCuit,
                this.companyAddress,
                itemDTOs,
                sale.getCae(),
                sale.getCaeVto(),
                sale.getTipoComprobante(),
                sale.getNroComprobante()
        );
    }
}