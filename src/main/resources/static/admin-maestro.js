/**
 * BÁEZ POS - PANEL MAESTRO DE ADMINISTRACIÓN
 * Alexander Baez - 2026
 */

const API_BASE = "http://localhost:8080/api/v1/superadmin/companies";
const LOGS_BASE = "http://localhost:8080/api/v1/superadmin/logs";

// Variables Globales
let modalEdicion;
let todasLasEmpresas = [];
let token = localStorage.getItem('baezpos_token');

document.addEventListener('DOMContentLoaded', () => {
    token = localStorage.getItem('baezpos_token');
    const role = localStorage.getItem('baezpos_user_role');

    console.log("Verificando acceso Alexander...", { role });

    // Refresco automático de logs cada 30 segundos
    setInterval(() => {
        console.log("Auto-refresco de logs...");
        cargarLogs();
    }, 30000);

    // Verificación flexible
    const esValido = role && (role === 'SUPER_ADMIN' || role === 'ROLE_SUPER_ADMIN' || role.includes('SUPER_ADMIN'));

    if (!token || !esValido) {
        console.error("Acceso denegado.");
        window.location.href = 'login.html';
        return;
    }

    // --- AQUÍ EMPIEZA LA CARGA DEL PANEL ---

    // 1. Inicializar Modal de Bootstrap
    const modalElement = document.getElementById('modalEditar');
    if (modalElement) {
        modalEdicion = new bootstrap.Modal(modalElement);
    }

    // 2. Configurar Buscador
    const buscador = document.getElementById('buscadorEmpresas');
    if (buscador) {
        buscador.addEventListener('input', (e) => filtrarEmpresas(e.target.value));
    }

    // 3. Cargar los datos del servidor
    cargarTodo();
});

/**
 * Función central para refrescar toda la interfaz
 */
function cargarTodo() {
    console.log("Cargando datos del servidor...");
    cargarEmpresas();
    cargarLogs();
}

// --- FUNCIONALIDAD 1: GESTIÓN DE EMPRESAS Y MÉTRICAS ---

async function cargarEmpresas() {
    try {
        console.log("Intentando fetch a:", API_BASE);
        const resp = await fetch(API_BASE, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!resp.ok) {
            console.error("Error en la respuesta de Empresas:", resp.status);
            if (resp.status === 403) {
                console.error("ALEXANDER: El servidor dice que tu token no tiene permiso.");
            }
            return;
        }

        const empresas = await resp.json();
        todasLasEmpresas = empresas;
        renderizarTabla(empresas);
        actualizarKpis(empresas);

    } catch (err) {
        console.error("Fallo de red al cargar empresas:", err);
    }
}

function renderizarTabla(empresas) {
    const tbody = document.getElementById('tablaEmpresas');
    if (!tbody) return;
    tbody.innerHTML = '';

    const hoy = new Date();
    const proximoVencimiento = new Date();
    proximoVencimiento.setDate(hoy.getDate() + 7);

    if (empresas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center p-4 text-muted">No hay empresas registradas aún.</td></tr>';
        return;
    }

    empresas.forEach(emp => {
        // Manejo de fecha (Spring manda [Y, M, D] o String ISO)
        let venc = Array.isArray(emp.expirationDate)
            ? new Date(emp.expirationDate[0], emp.expirationDate[1]-1, emp.expirationDate[2])
            : new Date(emp.expirationDate + "T00:00:00");

        let rowClass = "";
        let badge = "";

        // Si la empresa está explícitamente desactivada o vencida
        if (emp.active === false || !venc || venc < hoy) {
            rowClass = "row-vencido";
            badge = `<span class="badge rounded-pill bg-danger shadow-sm"><i class="bi bi-x-circle me-1"></i>${emp.active === false ? 'SUSPENDIDO' : 'VENCIDO'}</span>`;
        } else if (venc <= proximoVencimiento) {
            rowClass = "row-pronto";
            badge = '<span class="badge rounded-pill bg-warning text-dark shadow-sm"><i class="bi bi-exclamation-triangle me-1"></i>POR VENCER</span>';
        } else {
            badge = '<span class="badge rounded-pill bg-success shadow-sm"><i class="bi bi-check-all me-1"></i>AL DÍA</span>';
        }

        const fechaFormateada = venc && !isNaN(venc) ? venc.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }) : '---';

        // WhatsApp: limpiamos el número de caracteres no numéricos
        const cleanPhone = emp.phone ? emp.phone.replace(/\D/g, '') : '';
        const msgWS = encodeURIComponent(`Hola ${emp.name}, soy Alexander de BÁEZ POS. Te contacto por tu suscripción...`);

        tbody.innerHTML += `
            <tr class="align-middle ${rowClass}">
                <td class="ps-3">
                    <div class="d-flex align-items-center">
                        <div class="rounded-circle bg-primary bg-opacity-10 p-2 me-3 text-primary">
                            <i class="bi bi-shop fs-5"></i>
                        </div>
                        <div>
                            <div class="fw-bold text-white">${emp.name}</div>
                            <div class="text-muted" style="font-size: 0.65rem;">CUIT: ${emp.taxId || 'N/A'}</div>
                        </div>
                    </div>
                </td>
                <td><span class="text-muted small">${emp.email}</span></td>
                <td><div class="fw-bold small text-white">${fechaFormateada}</div></td>
                <td>${badge}</td>
                <td class="text-end pe-3">
                    <div class="d-flex justify-content-end gap-1">
                        <button class="btn btn-action btn-outline-info" title="Editar" onclick="prepararEdicion(${emp.id})"><i class="bi bi-pencil-fill"></i></button>
                        <button class="btn btn-action btn-outline-success" title="WhatsApp" onclick="window.open('https://wa.me/${cleanPhone}?text=${msgWS}')"><i class="bi bi-whatsapp"></i></button>
                        <button class="btn btn-action btn-outline-primary" title="Extender" onclick="extenderAbono(${emp.id})"><i class="bi bi-plus-lg"></i></button>
                        <button class="btn btn-action btn-outline-danger" title="Eliminar" onclick="eliminarEmpresa(${emp.id})"><i class="bi bi-trash3"></i></button>
                    </div>
                </td>
            </tr>
        `;
    });
}

function actualizarKpis(empresas) {
    const hoy = new Date();
    const proximoVenc = new Date();
    proximoVenc.setDate(hoy.getDate() + 7);

    let activos = 0, vencidos = 0, pronto = 0;

    // --- CONFIGURACIÓN DE ALEXANDER ---
    const PRECIO_ABONO = 25000;

    empresas.forEach(e => {
        let v = Array.isArray(e.expirationDate)
            ? new Date(e.expirationDate[0], e.expirationDate[1] - 1, e.expirationDate[2])
            : new Date(e.expirationDate + "T00:00:00");

        if (e.active === false || !v || v < hoy) {
            vencidos++;
        } else {
            activos++;
            if (v <= proximoVenc) pronto++;
        }
    });

    const recaudacionTotal = activos * PRECIO_ABONO;

    if(document.getElementById('kpiTotal')) document.getElementById('kpiTotal').innerText = empresas.length;
    if(document.getElementById('kpiActivos')) document.getElementById('kpiActivos').innerText = activos;
    if(document.getElementById('kpiVencidos')) document.getElementById('kpiVencidos').innerText = vencidos;
    if(document.getElementById('kpiProntoVencer')) document.getElementById('kpiProntoVencer').innerText = pronto;

    if(document.getElementById('kpiGanancia')) {
        document.getElementById('kpiGanancia').innerText = new Intl.NumberFormat('es-AR', {
            style: 'currency',
            currency: 'ARS'
        }).format(recaudacionTotal);
    }
}

// --- FUNCIONALIDAD 2: REGISTRO MAESTRO ---
const formNueva = document.getElementById('formNuevaEmpresa');
if (formNueva) {
    formNueva.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btnSubmit = e.target.querySelector('button[type="submit"]');
        btnSubmit.disabled = true;

        const nuevaEmpRequest = {
            companyName: document.getElementById('masterNombre').value,
            taxId: document.getElementById('masterTaxId').value,
            address: document.getElementById('masterDireccion').value,
            phone: document.getElementById('masterTelefono').value,
            expirationDate: document.getElementById('masterVenc').value,
            ownerName: "Admin " + document.getElementById('masterNombre').value,
            ownerEmail: document.getElementById('masterEmail').value,
            ownerPassword: document.getElementById('masterPass').value
        };

        try {
            const resp = await fetch(`${API_BASE}/full-register`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(nuevaEmpRequest)
            });

            if (resp.ok) {
                Swal.fire('¡Éxito!', 'Comercio y Administrador creados correctamente.', 'success');
                cargarTodo();
                e.target.reset();
            } else {
                const errorText = await resp.text();
                Swal.fire('Error de Registro', errorText || 'Verifique los datos', 'error');
            }
        } catch (err) {
            Swal.fire('Error de Red', 'No se pudo conectar con el servidor.', 'error');
        } finally {
            btnSubmit.disabled = false;
        }
    });
}

// --- FUNCIONALIDAD 3: EDICIÓN PROFESIONAL (MODAL) ---

function prepararEdicion(id) {
    const emp = todasLasEmpresas.find(e => e.id === id);

    if (!emp) {
        Swal.fire('Error', 'No se encontró la empresa en la lista local', 'error');
        return;
    }

    try {
        document.getElementById('editId').value = emp.id;
        document.getElementById('editNombre').value = emp.name || '';
        document.getElementById('editEmail').value = emp.email || '';
        document.getElementById('editTaxId').value = emp.taxId || '';
        document.getElementById('editPhone').value = emp.phone || '';
        document.getElementById('editAddress').value = emp.address || '';
        document.getElementById('editTicketMessage').value = emp.ticketMessage || '';
        document.getElementById('editPass').value = '';

        // Sincronizar estado Activo/Suspendido si existe el elemento en el HTML
        if(document.getElementById('editActive')) {
            document.getElementById('editActive').value = emp.active !== undefined ? emp.active.toString() : "true";
        }

        if (emp.expirationDate) {
            let fechaStr = "";
            if (Array.isArray(emp.expirationDate)) {
                const y = emp.expirationDate[0];
                const m = String(emp.expirationDate[1]).padStart(2, '0');
                const d = String(emp.expirationDate[2]).padStart(2, '0');
                fechaStr = `${y}-${m}-${d}`;
            } else {
                fechaStr = emp.expirationDate.split('T')[0];
            }
            document.getElementById('editVencimiento').value = fechaStr;
        }

        modalEdicion.show();
    } catch (err) {
        console.error("Error al llenar el modal:", err);
        Swal.fire('Error', 'Error al procesar los datos para edición', 'error');
    }
}

document.getElementById('formEditarEmpresa').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('editId').value;

    const payload = {
        name: document.getElementById('editNombre').value,
        email: document.getElementById('editEmail').value,
        taxId: document.getElementById('editTaxId').value,
        phone: document.getElementById('editPhone').value,
        address: document.getElementById('editAddress').value,
        ticketMessage: document.getElementById('editTicketMessage').value,
        expirationDate: document.getElementById('editVencimiento').value,
        active: document.getElementById('editActive') ? document.getElementById('editActive').value === "true" : true,
        ownerPassword: document.getElementById('editPass').value || null
    };

    try {
        const resp = await fetch(`${API_BASE}/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            modalEdicion.hide();
            Swal.fire('¡Actualizado!', 'Los cambios se aplicaron correctamente.', 'success');
            cargarTodo();
        } else {
            const errorData = await resp.text();
            Swal.fire('Error', 'El servidor rechazó el cambio.', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Fallo de conexión con el servidor.', 'error');
    }
});

// --- FUNCIONALIDAD 4: EXTENDER SUSCRIPCIÓN ---

async function extenderAbono(id) {
    const confirm = await Swal.fire({
        title: '¿Confirmar Extensión?',
        text: "Se sumarán 30 días a la suscripción actual.",
        icon: 'question',
        showCancelButton: true,
        confirmButtonText: 'Sí, extender',
        confirmButtonColor: '#3b82f6'
    });

    if (!confirm.isConfirmed) return;

    try {
        const resp = await fetch(`${API_BASE}/${id}/extend`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (resp.ok) {
            Swal.fire('¡Suscripción Renovada!', 'Se han acreditado 30 días adicionales.', 'success');
            cargarTodo();
        } else {
            Swal.fire('Error', 'No se pudo procesar la extensión', 'error');
        }
    } catch (err) {
        Swal.fire('Error', 'Error de comunicación', 'error');
    }
}

// --- FUNCIONALIDAD 5: ELIMINACIÓN DE EMPRESAS ---

async function eliminarEmpresa(id) {
    const result = await Swal.fire({
        title: '¿ESTÁS SEGURO?',
        text: "Alexander, esta acción eliminará todos los registros. No hay vuelta atrás.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#ef4444',
        confirmButtonText: 'SÍ, ELIMINAR',
        cancelButtonText: 'CANCELAR'
    });

    if (result.isConfirmed) {
        try {
            const resp = await fetch(`${API_BASE}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (resp.ok) {
                Swal.fire('Baja Exitosa', 'Empresa borrada.', 'success');
                cargarTodo();
            } else {
                Swal.fire('Error', 'No se pudo eliminar.', 'error');
            }
        } catch (err) {
            Swal.fire('Error', 'Falla de conexión', 'error');
        }
    }
}

// --- FUNCIONALIDAD 6: BITÁCORA DE ACTIVIDAD (LOGS) ---

async function cargarLogs() {
    try {
        console.log("Enviando Token a Logs:", token); // <-- Verificá esto en consola
        const resp = await fetch(LOGS_BASE, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/json'
            }
        });

        if (resp.status === 403) {
            console.error("ERROR 403: Alexander, el backend no te deja entrar a los LOGS. Revisá los permisos en Java.");
            return;
        }

        if (!resp.ok) return;
        // ... resto del código igual
        const logs = await resp.json();
        const contenedor = document.getElementById('listaLogs');
        if (!contenedor) return;

        if (logs.length === 0) {
            contenedor.innerHTML = '<div class="p-4 text-center text-muted small">Sin actividad registrada.</div>';
            return;
        }

        contenedor.innerHTML = logs.map(log => {
            const fecha = new Date(log.timestamp).toLocaleString('es-AR', {
                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
            });
            let color = 'text-info';
            if(log.action === 'ELIMINACIÓN') color = 'text-danger';
            if(log.action === 'EXTENSIÓN') color = 'text-success';
            if(log.action === 'CREACIÓN') color = 'text-primary';

            return `
                <div class="log-item p-3 border-bottom border-secondary border-opacity-10">
                    <div class="d-flex justify-content-between align-items-center mb-1">
                        <span class="fw-bold ${color} small uppercase" style="font-size: 0.65rem;">${log.action}</span>
                        <span class="text-muted" style="font-size: 0.6rem;">${fecha}</span>
                    </div>
                    <div class="text-white-50" style="font-size: 0.72rem;">${log.description}</div>
                </div>
            `;
        }).join('');
    } catch (err) { console.error("Error logs:", err); }
}

// --- FUNCIONALIDAD 7: BUSCADOR Y AUXILIARES ---

function filtrarEmpresas(termino) {
    const filas = document.querySelectorAll('#tablaEmpresas tr');
    const t = termino.toLowerCase().trim();
    filas.forEach(fila => {
        fila.style.display = fila.innerText.toLowerCase().includes(t) ? '' : 'none';
    });
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