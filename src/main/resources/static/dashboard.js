const BASE_URL = 'http://localhost:8080/api/v1';
const API_SALES = `${BASE_URL}/sales`; // Usamos el endpoint general para calcular históricos
const API_PRODUCTS = `${BASE_URL}/products`;

const token = localStorage.getItem('baezpos_token');
const userName = localStorage.getItem('baezpos_user_name');

document.addEventListener('DOMContentLoaded', async () => {
    if (!token) { window.location.href = 'login.html'; return; }

    document.getElementById('userNameLabel').innerText = userName || 'Usuario';
    document.getElementById('fechaActual').innerText = new Date().toLocaleDateString('es-AR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    // Cargamos todo en paralelo para máxima velocidad
    await Promise.all([
        cargarDatosDashboard(),
        cargarAlertasStock(),
        cargarDatosGrafico() // <--- Nueva función
    ]);
});

function cargarDatosPerfil() {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        const nombreUsuario = payload.sub || "Usuario";

        // 1. Seteamos el nombre en el texto
        document.getElementById('userName').innerText = nombreUsuario;

        // 2. NUEVO: Seteamos la inicial en el avatar del Nav
        const elInitial = document.getElementById('userInitial');
        if (elInitial) {
            elInitial.innerText = nombreUsuario.charAt(0).toUpperCase();
        }

        // 3. Seteamos el nombre de la empresa
        if(payload.companyName) {
            document.getElementById('companyName').innerText = payload.companyName;
        }

    } catch (e) {
        console.error("Error perfil:", e);
    }
}

async function cargarDatosDashboard() {
    try {
        const response = await fetch(`${BASE_URL}/sales/report/box`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("No se pudo obtener el reporte de caja");

        const data = await response.json();

        // Función rápida para formatear dinero en pesos argentinos
        const fmt = (val) => new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(val || 0);

        // --- 1. RESUMEN DE HOY (Las 4 tarjetas superiores) ---
        document.getElementById('txtRecaudacion').innerText = fmt(data.todaySales);
        document.getElementById('txtEfectivoHoy').innerText = fmt(data.cashSales);
        document.getElementById('txtTransfHoy').innerText = fmt(data.transferSales);
        document.getElementById('txtGastos').innerText = fmt(data.todayExpenses);

        // --- 2. LAS NUEVAS TARJETAS (Libreta y Balance Real) ---
        // 'creditSales' es el 4to campo de tu DTO
        document.getElementById('cardLibreta').innerText = fmt(data.creditSales);
        // 'finalBalance' es el 7mo campo de tu DTO
        document.getElementById('cardBalanceReal').innerText = fmt(data.finalBalance);

        // --- 3. RENDIMIENTO MENSUAL (Las 2 tarjetas del medio) ---
        // 'monthSales' es el 8vo campo de tu DTO
        document.getElementById('txtRecaudacionMes').innerText = fmt(data.monthSales);
        // 'todayCount' es el 11vo campo (long)
        document.getElementById('txtVentasCountMes').innerText = data.todayCount;

        // --- 4. COLOR DINÁMICO PARA EL BALANCE REAL ---
        const balanceRealElement = document.getElementById('cardBalanceReal');
        if (data.finalBalance < 0) {
            balanceRealElement.parentElement.parentElement.classList.replace('bg-info', 'bg-danger');
        } else {
            balanceRealElement.parentElement.parentElement.classList.replace('bg-danger', 'bg-info');
        }

    } catch (err) {
        console.error("Error al cargar el Dashboard:", err);
    }
}

function renderizarGraficoSemanal(etiquetas, valores) {
    const canvas = document.getElementById('chartSemanal');
    const ctx = canvas.getContext('2d');

    // Creamos un degradado (fuerte arriba, transparente abajo)
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(30, 58, 138, 0.4)'); // Azul BaezPOS
    gradient.addColorStop(1, 'rgba(30, 58, 138, 0.0)');

    if (window.myChart) window.myChart.destroy();

    window.myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [{
                label: 'Ventas ($)',
                data: valores,
                borderColor: '#1e3a8a',
                borderWidth: 3,
                backgroundColor: gradient, // Aplicamos el degradado
                fill: true,
                tension: 0.4, // Curva suave
                pointRadius: 4,
                pointHoverRadius: 8,
                pointBackgroundColor: '#fff',
                pointBorderColor: '#1e3a8a',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1e3a8a',
                    titleFont: { size: 14, weight: 'bold' },
                    bodyFont: { size: 13 },
                    padding: 10,
                    displayColors: false,
                    callbacks: {
                        label: function(context) {
                            return 'Ventas: ' + new Intl.NumberFormat('es-AR', {
                                style: 'currency', currency: 'ARS'
                            }).format(context.parsed.y);
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: '#f3f4f6', drawBorder: false },
                    ticks: {
                        callback: value => '$' + value.toLocaleString('es-AR'),
                        color: '#9ca3af'
                    }
                },
                x: {
                    grid: { display: false },
                    ticks: { color: '#9ca3af' }
                }
            }
        }
    });
}

async function cargarAlertasStock() {
    try {
        const res = await fetch(API_PRODUCTS, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const productos = await res.json();
        const criticos = productos.filter(p => p.stock < 10);
        const container = document.getElementById('listaAlertasStock');
        document.getElementById('badgeStockCount').innerText = criticos.length;

        if (criticos.length === 0) {
            container.innerHTML = `<div class="text-center py-4"><i class="bi bi-check-circle text-success fs-2"></i><p class="small text-muted">Stock saludable</p></div>`;
            return;
        }

        container.innerHTML = criticos.map(p => `
            <div class="d-flex align-items-center p-3 mb-2 rounded-3 border-start border-4 ${p.stock <= 3 ? 'border-danger bg-danger bg-opacity-10' : 'border-warning bg-warning bg-opacity-10'}">
                <div class="flex-grow-1">
                    <h6 class="mb-0 fw-bold small">${p.name}</h6>
                    <small class="text-muted">Stock actual: ${p.stock}</small>
                </div>
                <span class="badge ${p.stock <= 3 ? 'bg-danger' : 'bg-warning'} text-white">${p.stock}</span>
            </div>
        `).join('');
    } catch (err) { console.error(err); }
}

async function cargarDatosGrafico() {
    try {
        const response = await fetch(`${BASE_URL}/sales/report/chart`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error("Error en el gráfico");

        const data = await response.json(); // Viene: [{label: "2026-03-20", total: 1500}, ...]

        // Extraemos las etiquetas y los valores
        // El slice(-5) es opcional por si la fecha viene año-mes-dia y querés solo dia/mes
        const etiquetas = data.map(item => {
            const partes = item.label.split('-');
            return `${partes[2]}/${partes[1]}`; // Retorna DD/MM
        });

        const valores = data.map(item => item.total);

        renderizarGraficoSemanal(etiquetas, valores);

    } catch (err) {
        console.error("Error al cargar gráfico:", err);
    }
}

function cerrarSesion() {
    Swal.fire({
        title: '¿Cerrar sesión?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Salir',
        cancelButtonText: 'Cancelar'
    }).then((result) => {
        if (result.isConfirmed) {
            localStorage.clear();
            window.location.href = 'login.html';
        }
    });
}