/**
 * BÁEZ POS - DASHBOARD DE GESTIÓN LOCAL
 * Sistema de Control Financiero y Métricas de Rendimiento Real
 */

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Renderizar el nombre real del usuario activo desde el localStorage
    const elUserLabel = document.getElementById('userNameLabel');
    if (elUserLabel) {
        const nombreUsuario = localStorage.getItem('baezpos_user_name');
        elUserLabel.innerText = nombreUsuario ? nombreUsuario.toUpperCase() : "ADMINISTRADOR";
    }

    // 2. Establecer fecha actual localizada
    if (document.getElementById('fechaActual')) {
        document.getElementById('fechaActual').innerText = new Date().toLocaleDateString('es-AR', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
        });
    }

    // 3. Carga concurrente de los datos de la interfaz
    await cargarDatosDashboard();
    await cargarAlertasStock();
    await cargarDatosGrafico();
});

async function cargarDatosDashboard() {
    try {
        // Petición al endpoint de reporte de caja diario/mensual
        const response = await apiFetch(`/sales/report/box?period=today`);
        const data = await response.json();

        // Formateador de moneda oficial para Argentina (ARS)
        const fmt = (val) => new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS',
            signDisplay: 'auto'
        }).format(val || 0);

        // --- 1. TOTALES PRINCIPALES HOY ---
        if (document.getElementById('txtRecaudacion'))
            document.getElementById('txtRecaudacion').innerText = fmt(data.totalSales);

        if (document.getElementById('cardBalanceReal'))
            document.getElementById('cardBalanceReal').innerText = fmt(data.realBalance);

        if (document.getElementById('txtEfectivoHoy'))
            document.getElementById('txtEfectivoHoy').innerText = fmt(data.cashSales);

        if (document.getElementById('txtTransfHoy'))
            document.getElementById('txtTransfHoy').innerText = fmt(data.transferSales);

        // --- 2. GESTIÓN DE CUENTA CORRIENTE (LIBRETA) ---
        if (document.getElementById('cardLibreta')) {
            const elLibreta = document.getElementById('cardLibreta');
            const saldoLibreta = data.tCredit || 0;
            elLibreta.innerText = fmt(saldoLibreta);

            if (saldoLibreta < 0) {
                elLibreta.classList.remove('text-danger');
                elLibreta.classList.add('text-success');
            } else {
                elLibreta.classList.remove('text-success');
                elLibreta.classList.add('text-danger');
            }
        }

        // --- 3. RENDIMIENTO MENSUAL ANALÍTICO (NUEVAS MÉTRICAS) ---
        if (document.getElementById('txtRecaudacionMes'))
            document.getElementById('txtRecaudacionMes').innerText = fmt(data.monthSales);

        if (document.getElementById('txtGananciaMes'))
            document.getElementById('txtGananciaMes').innerText = fmt(data.monthProfit);

        if (document.getElementById('txtReposicionMes'))
            document.getElementById('txtReposicionMes').innerText = fmt(data.monthReplacementCost);

        if (document.getElementById('txtVentasCountMes'))
            document.getElementById('txtVentasCountMes').innerText = data.monthOperations || 0;

    } catch (err) {
        console.error("Error al cargar KPIs del Dashboard:", err);
    }
}

async function cargarDatosGrafico() {
    try {
        const response = await apiFetch(`/sales/report/chart`);
        const data = await response.json();

        if (!data || data.length === 0) return;

        const etiquetas = data.map(item => {
            const partes = item.label.split('-');
            return `${partes[2]}/${partes[1]}`; // Convierte YYYY-MM-DD a DD/MM
        });

        const valores = data.map(item => item.total);
        renderizarGraficoSemanal(etiquetas, valores);

    } catch (err) {
        console.error("Error en gráfico:", err);
    }
}

function renderizarGraficoSemanal(etiquetas, valores) {
    const canvas = document.getElementById('chartSemanal');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(37, 99, 235, 0.2)');
    gradient.addColorStop(1, 'rgba(37, 99, 235, 0)');

    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Ventas ($)',
                data: valores,
                borderColor: '#2563eb',
                borderWidth: 4,
                backgroundColor: gradient,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                x: { grid: { display: false } }
            }
        }
    });
}

async function cargarAlertasStock() {
    try {
        const res = await apiFetch('/products');
        const productos = await res.json();

        // Filtrar productos con existencias críticas
        const criticos = productos.filter(p => p.stock < 10);

        const badge = document.getElementById('badgeStockCount');
        if (badge) badge.innerText = criticos.length;

        const container = document.getElementById('listaAlertasStock');
        if (!container) return;

        if (criticos.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5 opacity-50">
                    <i class="bi bi-shield-check fs-1 text-success"></i>
                    <p class="mt-2 small">Stock al día. Sin alertas.</p>
                </div>`;
            return;
        }

        container.innerHTML = criticos.map(p => `
            <div class="d-flex align-items-center p-3 mb-3 rounded-4 border-start border-4 ${p.stock <= 3 ? 'border-danger bg-danger bg-opacity-10' : 'border-warning bg-warning bg-opacity-10'}">
                <div class="flex-grow-1">
                    <h6 class="mb-0 fw-bold small text-dark">${p.name.toUpperCase()}</h6>
                    <small class="text-muted">Quedan ${p.stock} unidades</small>
                </div>
                <span class="badge ${p.stock <= 3 ? 'bg-danger' : 'bg-warning'} rounded-pill">${p.stock}</span>
            </div>
        `).join('');

    } catch (err) {
        console.error("Error en módulo de stock:", err);
        const container = document.getElementById('listaAlertasStock');
        if (container) {
            container.innerHTML = '<p class="text-danger small text-center py-3">Error al conectar con inventario</p>';
        }
    }
}