/**
 * BÁEZ POS - PANEL MAESTRO DE ADMINISTRACIÓN
 * Alexander Baez - 2026
 * Versión Local: Auditoría de Usuarios y Control de Sistema
 */

// AJUSTE: Apuntamos a los nuevos endpoints de tu backend local
const API_BASE = "/users"; // Antes era superadmin/companies
const LOGS_BASE = "/logs";  // Endpoint de logs generales

// Variables Globales (Mantenemos todas)
let modalEdicion;
let todosLosUsuarios = []; // Antes todasLasEmpresas

document.addEventListener('DOMContentLoaded', () => {

    // Refresco automático de logs cada 30 segundos (Tu lógica original)
    setInterval(() => {
        console.log("Auto-refresco de logs...");
        cargarLogs();
    }, 30000);

    // La seguridad de JWT la hace auth.js. Solo validamos el rol aquí.
    const role = localStorage.getItem('baezpos_user_role');
    const esValido = role && (role === 'ADMIN' || role === 'SUPER_ADMIN' || role.includes('ADMIN'));

    if (!esValido) {
        console.error("Acceso denegado: Se requiere rol ADMIN.");
        window.location.href = 'login.html';
        return;
    }

    // 1. Inicializar Modal de Bootstrap
    const modalElement = document.getElementById('modalEditar');
    if (modalElement) {
        modalEdicion = new bootstrap.Modal(modalElement);
    }

    // 2. Configurar Buscador (Mantenemos funcionalidad completa)
    const buscador = document.getElementById('buscadorEmpresas');
    if (buscador) {
        buscador.addEventListener('input', (e) => filtrarUsuarios(e.target.value));
    }

    // 3. Cargar los datos del servidor
    cargarTodo();
});

function cargarTodo() {
    console.log("Cargando datos del servidor...");
    cargarUsuarios(); // Antes cargarEmpresas
    cargarLogs();
}

// --- FUNCIONALIDAD 1: GESTIÓN DE PERSONAL Y MÉTRICAS ---

async function cargarUsuarios() {
    try {
        const resp = await apiFetch(API_BASE);

        if (!resp.ok) {
            console.error("Error en la respuesta:", resp.status);
            return;
        }

        const usuarios = await resp.json();
        todosLosUsuarios = usuarios;
        renderizarTabla(usuarios);
        actualizarKpis(usuarios);

    } catch (err) {
        console.error("Fallo de red al cargar usuarios:", err);
    }
}

function renderizarTabla(usuarios) {
    const tbody = document.getElementById('tablaEmpresas');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted">No hay usuarios registrados aún.</td></tr>';
        return;
    }

    usuarios.forEach(user => {
        let rowClass = "";
        let badge = "";

        // Lógica de estado Activo/Inactivo
        if (user.enabled === false) {
            rowClass = "row-vencido";
            badge = `<span class="badge rounded-pill bg-danger shadow-sm"><i class="bi bi-x-circle me-1"></i>SUSPENDIDO</span>`;
        } else {
            badge = '<span class="badge rounded-pill bg-success shadow-sm"><i class="bi bi-check-all me-1"></i>ACTIVO</span>';
        }

        // Mantenemos la funcionalidad de WhatsApp por si necesitas contactar al empleado
        const cleanPhone = user.phone ? user.phone.replace(/\D/g, '') : '';
        const msgWS = encodeURIComponent(`Hola ${user.name}, te contacto desde la administración de BaezPOS...`);

        tbody.innerHTML += `
            <tr class="align-middle ${rowClass}">
                <td class="ps-3">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-primary bg-opacity-10 p-2 me-3 text-primary">
                            <i class="bi bi-person-badge fs-5"></i>
                        </div>
                        <div>
                            <div class="fw-bold text-white">${user.name}</div>
                            <div class="text-muted" style="font-size: 0.65rem;">ROL: ${user.role}</div>
                        </div>
                    </div>
                </td>
                <td><span class="text-muted small">${user.email}</span></td>
                <td><div class="fw-bold small text-white">${user.lastLogin || 'N/A'}</div></td>
                <td>${badge}</td>
                <td class="text-end pe-3">
                    <div class="d-flex justify-content-end gap-1">
                        <button class="btn btn-action btn-outline-info" title="Editar" onclick="prepararEdicion(${user.id})"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn btn-action btn-outline-success" title="WhatsApp" onclick="window.open('https://wa.me/${cleanPhone}?text=${msgWS}')"><i class="bi bi-whatsapp"></i></button>
                        <button class="btn btn-action btn-outline-danger" title="Eliminar" onclick="eliminarUsuario(${user.id})"><i class="bi bi-trash3"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function actualizarKpis(usuarios) {
    // Reconvertimos tus KPIs de "Abonos" a "Métricas de Personal"
    let activos = usuarios.filter(u => u.enabled).length;
    let inactivos = usuarios.length - activos;

    if(document.getElementById('kpiTotal')) document.getElementById('kpiTotal').innerText = usuarios.length;
    if(document.getElementById('kpiActivos')) document.getElementById('kpiActivos').innerText = activos;
    if(document.getElementById('kpiVencidos')) document.getElementById('kpiVencidos').innerText = inactivos;

    // El KPI de ganancia ahora puede reflejar la caja total del local si tenés el endpoint
    if(document.getElementById('kpiGanancia')) {
        document.getElementById('kpiGanancia').innerText = "PANEL LOCAL";
    }
}

// --- FUNCIONALIDAD 2: REGISTRO DE NUEVO USUARIO ---
const formNueva = document.getElementById('formNuevaEmpresa');
if (formNueva) {
    formNueva.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;

        const nuevoUserRequest = {
            name: document.getElementById('masterNombre').value,
            email: document.getElementById('masterEmail').value,
            password: document.getElementById('masterPass').value,
            role: "USER", // Por defecto vendedor
            phone: document.getElementById('masterTelefono').value
        };

        try {
            const resp = await apiFetch(`${API_BASE}/register`, {
                method: 'POST',
                body: JSON.stringify(nuevoUserRequest)
            });

            if (resp.ok) {
                Swal.fire('¡Éxito!', 'Usuario creado correctamente.', 'success');
                cargarTodo();
                e.target.reset();
            } else {
                Swal.fire('Error', 'No se pudo crear el usuario', 'error');
            }
        } catch (err) {
            Swal.fire('Error de Red', 'Fallo de conexión.', 'error');
        } finally {
            btnSubmit.disabled = false;
        }
    });
}

// --- FUNCIONALIDAD 3: EDICIÓN (MODAL) ---

function prepararEdicion(id) {
    const user = todosLosUsuarios.find(u => u.id === id);
    if (!user) return;

    document.getElementById('editId').value = user.id;
    document.getElementById('editNombre').value = user.name || '';
    document.getElementById('editEmail').value = user.email || '';
    document.getElementById('editPhone').value = user.phone || '';

    if(document.getElementById('editActive')) {
        document.getElementById('editActive').value = user.enabled.toString();
    }

    modalEdicion.show();
}

document.getElementById('formEditarEmpresa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;

    const payload = {
        name: document.getElementById('editNombre').value,
        email: document.getElementById('editEmail').value,
        phone: document.getElementById('editPhone').value,
        enabled: document.getElementById('editActive').value === "true"
    };

    try {
        const resp = await apiFetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            modalEdicion.hide();
            Swal.fire('¡Actualizado!', 'Cambios aplicados.', 'success');
            cargarTodo();
        }
    } catch (err) {
        Swal.fire('Error', 'Fallo al guardar cambios.', 'error');
    }
});

// --- FUNCIONALIDAD 4: BITÁCORA DE ACTIVIDAD (LOGS) ---

async function cargarLogs() {
    try {
        const resp = await apiFetch(LOGS_BASE);

        if (!resp.ok) return;

        const logs = await resp.json();
        const contenedor = document.getElementById('listaLogs');
        if (!contenedor) return;

        contenedor.innerHTML = logs.map(log => {
            const fecha = new Date(log.timestamp).toLocaleString();
            let color = 'text-info';
            if(log.action.includes('ELIMINAR')) color = 'text-danger';
            if(log.action.includes('VENTA')) color = 'text-success';

            return `
                <div class="log-item p-3 border-bottom border-secondary border-opacity-10">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold ${color} small uppercase">${log.action}</span>
                        <span class="text-muted" style="font-size: 0.6rem;">${fecha}</span>
                    </div>
                    <div class="text-white-50" style="font-size: 0.72rem;">${log.description}</div>
                    <div class="text-primary" style="font-size: 0.6rem;">User: ${log.userEmail}</div>
                </div>
            `;
        }).join('');
    } catch (err) { console.error("Error logs:", err); }
}

// --- FUNCIONALIDAD 5: ELIMINACIÓN ---

async function eliminarUsuario(id) {
    const result = await Swal.fire({
        title: '¿ESTÁS SEGURO?',
        text: "Esta acción revocará el acceso permanentemente.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'SÍ, ELIMINAR'
    });

    if (result.isConfirmed) {
        try {
            const resp = await apiFetch(`${API_BASE}/${id}`, {
                method: 'DELETE'
            });
            if (resp.ok) {
                Swal.fire('Eliminado', 'Usuario borrado.', 'success');
                cargarTodo();
            }
        } catch (err) { console.error(err); }
    }
}

// --- FUNCIONALIDAD 6: BUSCADOR Y AUXILIARES ---

function filtrarUsuarios(termino) {
    const filas = document.querySelectorAll('#tablaEmpresas tr');
    const t = termino.toLowerCase().trim();
    filas.forEach(fila => {
        fila.style.display = fila.innerText.toLowerCase().includes(t) ? '' : 'none';
    });
}