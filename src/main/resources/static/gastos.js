// ==========================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const API_EXPENSES = '/expenses';

// ==========================================
// 2. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // Auth manejado globalmente.
    cargarGastos();

    // Listener para el formulario
    const formGasto = document.getElementById('formGasto');
    if (formGasto) {
        formGasto.addEventListener('submit', guardarGasto);
    }
});

// ==========================================
// 3. LÓGICA DE DATOS (API)
// ==========================================

/**
 * Obtiene la lista de gastos desde el backend
 */
async function cargarGastos() {
    try {
        const res = await apiFetch(API_EXPENSES);

        if (!res.ok) throw new Error("Error al obtener la lista de gastos");

        const gastos = await res.json();
        renderizarGastos(gastos);
    } catch (err) {
        console.error("Error cargando gastos:", err);
        const tbody = document.getElementById('listaGastos');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger p-4"><i class="bi bi-exclamation-triangle me-2"></i> Error al conectar con el servidor.</td></tr>';
        }
    }
}

/**
 * Dibuja la tabla de gastos
 */
function renderizarGastos(gastos) {
    const tbody = document.getElementById('listaGastos');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (!gastos || gastos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-5 text-muted">No hay gastos registrados en este período.</td></tr>';
        return;
    }

    // Ordenamos por ID descendente (más recientes arriba)
    gastos.sort((a, b) => b.id - a.id).forEach(g => {
        // Formatear fecha para Argentina
        const fechaObj = g.date ? new Date(g.date) : new Date();
        const fechaFormateada = fechaObj.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        }) + 'hs';

        // Estilos de Badge por categoría
        let badgeClass = 'bg-light text-dark border';
        if (g.category === 'PROVEEDOR') badgeClass = 'bg-primary-subtle text-primary border-primary';
        if (g.category === 'SERVICIOS') badgeClass = 'bg-warning-subtle text-warning-emphasis border-warning';
        if (g.category === 'SUELDOS') badgeClass = 'bg-info-subtle text-info-emphasis border-info';
        if (g.category === 'MANTENIMIENTO') badgeClass = 'bg-secondary-subtle text-secondary-emphasis border-secondary';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 text-muted" style="font-size: 13px;">${fechaFormateada}</td>
            <td class="fw-bold text-dark text-uppercase">${g.description}</td>
            <td><span class="badge ${badgeClass}" style="font-size: 11px;">${g.category}</span></td>
            <td class="text-end pe-4 fw-black text-danger" style="font-size: 16px;">
                -$${g.amount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </td>
        `;
        tbody.appendChild(tr);
    });
}

/**
 * Envía un nuevo gasto al servidor
 */
async function guardarGasto(e) {
    e.preventDefault();

    const montoInput = document.getElementById('montoGasto');
    const descInput = document.getElementById('descGasto');
    const catInput = document.getElementById('catGasto');

    const monto = parseFloat(montoInput.value);

    // Validación de seguridad
    if (isNaN(monto) || monto <= 0) {
        return Swal.fire({
            icon: 'warning',
            title: 'Monto inválido',
            text: 'Por favor, ingresá un monto mayor a cero.',
            confirmButtonColor: '#dc3545'
        });
    }

    // Bloqueamos el botón para evitar duplicados
    const btnGuardar = e.target.querySelector('button[type="submit"]');
    const originalText = btnGuardar.innerHTML;
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    const nuevoGasto = {
        description: descInput.value.trim(),
        amount: monto,
        category: catInput.value,
        date: new Date().toISOString()
    };

    try {
        const res = await apiFetch(API_EXPENSES, {
            method: 'POST',
            body: JSON.stringify(nuevoGasto)
        });

        if (res.ok) {
            // Notificación rápida (Toast)
            const Toast = Swal.mixin({
                toast: true,
                position: 'top-end',
                showConfirmButton: false,
                timer: 2000,
                timerProgressBar: true
            });

            Toast.fire({
                icon: 'success',
                title: 'Gasto registrado correctamente'
            });

            // Limpiar formulario
            document.getElementById('formGasto').reset();

            // Cerrar el modal (Bootstrap 5)
            const modalEl = document.getElementById('modalNuevoGasto');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            if (modalInstance) {
                modalInstance.hide();
            }

            // Recargar la lista para mostrar el nuevo gasto
            cargarGastos();
        } else {
            const errorData = await res.json();
            throw new Error(errorData.message || "No se pudo procesar el registro.");
        }
    } catch (err) {
        Swal.fire({
            icon: 'error',
            title: 'Error al guardar',
            text: err.message,
            confirmButtonColor: '#dc3545'
        });
    } finally {
        // Restaurar botón
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = originalText;
    }
}