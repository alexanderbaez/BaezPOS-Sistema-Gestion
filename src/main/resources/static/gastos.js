// Configuración de API - Asegurate de que coincida con tu backend de Spring Boot
const API_EXPENSES = '/api/v1/expenses';
const token = localStorage.getItem('baezpos_token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Cargamos los gastos al iniciar
    cargarGastos();

    // Listener para el formulario
    document.getElementById('formGasto').addEventListener('submit', guardarGasto);
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

async function cargarGastos() {
    try {
        const res = await fetch(API_EXPENSES, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (res.status === 401) { cerrarSesion(); return; }
        if (!res.ok) throw new Error("Error al obtener la lista de gastos");

        const gastos = await res.json();
        renderizarGastos(gastos);
    } catch (err) {
        console.error("Error cargando gastos:", err);
        // Opcional: Mostrar error en la tabla si falla
        document.getElementById('listaGastos').innerHTML = '<tr><td colspan="4" class="text-center text-danger p-4">Error al conectar con el servidor.</td></tr>';
    }
}

function renderizarGastos(gastos) {
    const tbody = document.getElementById('listaGastos');
    tbody.innerHTML = '';

    if (gastos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center p-5 text-muted">No hay gastos registrados en este período.</td></tr>';
        return;
    }

    // Ordenamos por ID descendente (más recientes arriba)
    gastos.sort((a, b) => b.id - a.id).forEach(g => {
        // Formatear fecha
        const fechaObj = g.date ? new Date(g.date) : new Date();
        const fechaFormateada = fechaObj.toLocaleDateString('es-AR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        // Color de badge por categoría
        let badgeClass = 'bg-light text-dark border';
        if (g.category === 'PROVEEDOR') badgeClass = 'bg-primary-subtle text-primary border-primary';
        if (g.category === 'SERVICIOS') badgeClass = 'bg-warning-subtle text-warning-emphasis border-warning';
        if (g.category === 'SUELDOS') badgeClass = 'bg-info-subtle text-info-emphasis border-info';

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="ps-4 text-muted" style="font-size: 13px;">${fechaFormateada}</td>
            <td class="fw-bold text-dark">${g.description.toUpperCase()}</td>
            <td><span class="badge ${badgeClass}" style="font-size: 11px;">${g.category}</span></td>
            <td class="text-end pe-4 fw-bold text-danger">-$${g.amount.toFixed(2)}</td>
        `;
        tbody.appendChild(tr);
    });
}

async function guardarGasto(e) {
    e.preventDefault();

    // Bloqueamos el botón para evitar doble click
    const btnGuardar = e.target.querySelector('button[type="submit"]');
    btnGuardar.disabled = true;
    btnGuardar.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Guardando...';

    const nuevoGasto = {
        description: document.getElementById('descGasto').value,
        amount: parseFloat(document.getElementById('montoGasto').value),
        category: document.getElementById('catGasto').value,
        date: new Date().toISOString() // Enviamos la fecha actual en formato ISO
    };

    try {
        const res = await fetch(API_EXPENSES, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(nuevoGasto)
        });

        if (res.ok) {
            Swal.fire({
                icon: 'success',
                title: 'Gasto registrado correctamente',
                showConfirmButton: false,
                timer: 1500,
                toast: true,
                position: 'top-end'
            });

            document.getElementById('formGasto').reset();

            // Cerramos el modal de Bootstrap
            const modalEl = document.getElementById('modalNuevoGasto');
            const modalInstance = bootstrap.Modal.getInstance(modalEl);
            modalInstance.hide();

            // Recargamos la lista
            cargarGastos();
        } else {
            const errorData = await res.json();
            throw new Error(errorData.message || "No se pudo guardar el gasto");
        }
    } catch (err) {
        Swal.fire('Error', err.message, 'error');
    } finally {
        // Rehabilitamos el botón
        btnGuardar.disabled = false;
        btnGuardar.innerHTML = 'GUARDAR GASTO';
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