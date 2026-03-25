// ==========================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const BASE_URL = 'http://localhost:8080/api/v1';
const API_CUSTOMERS = `${BASE_URL}/customers`;
const API_PERFIL = "http://localhost:8080/api/v1/admin/my-company/profile";
const token = localStorage.getItem('baezpos_token');

let modalInstance;
let DATOS_EMPRESA = null; // Aquí guardaremos el nombre del local

// ==========================================
// 2. INICIALIZACIÓN (CON CARGA DE EMPRESA)
// ==========================================
document.addEventListener('DOMContentLoaded', async () => {
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    // Primero traemos los datos de la empresa para tener el nombre del local listo
    await cargarDatosEmpresa();
    // Luego cargamos la lista de clientes
    cargarClientes();
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

async function cargarDatosEmpresa() {
    try {
        const resp = await fetch(API_PERFIL, { // <--- USAMOS LA RUTA QUE YA SABEMOS QUE FUNCIONA
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (resp.ok) {
            DATOS_EMPRESA = await resp.json();
            console.log("✅ Empresa cargada desde DB:", DATOS_EMPRESA.name);
        } else {
            console.error("❌ No se pudo obtener el perfil de la empresa. Status:", resp.status);
        }
    } catch (err) {
        console.error("❌ Error de red al intentar cargar la empresa:", err);
    }
}

// ==========================================
// 3. FUNCIONES GLOBALES (ACCESIBLES DESDE HTML)
// ==========================================

window.toggleDetalle = function(index) {
    const el = document.getElementById(`detalle-${index}`);
    const icono = document.getElementById(`icon-${index}`);
    if (el) {
        if (el.classList.contains('d-none')) {
            el.classList.remove('d-none');
            if(icono) icono.classList.replace('bi-chevron-down', 'bi-chevron-up');
        } else {
            el.classList.add('d-none');
            if(icono) icono.classList.replace('bi-chevron-up', 'bi-chevron-down');
        }
    }
};

window.compartirWhatsApp = function(nombreCliente, fecha, total, itemsEncoded) {
    try {
        const items = JSON.parse(decodeURIComponent(itemsEncoded));

        // Sacamos los datos que guardaste en el perfil
        const nombreLocal = (DATOS_EMPRESA && DATOS_EMPRESA.name)
                            ? DATOS_EMPRESA.name.toUpperCase()
                            : "MI NEGOCIO";

        const direccion = (DATOS_EMPRESA && DATOS_EMPRESA.address) ? `📍 ${DATOS_EMPRESA.address}%0A` : "";
        const mensajePersonalizado = (DATOS_EMPRESA && DATOS_EMPRESA.ticketMessage)
                                      ? DATOS_EMPRESA.ticketMessage
                                      : "¡Gracias por su compra!";

        // ARMADO DEL MENSAJE
        let texto = `*🏠 ${nombreLocal}*%0A`;
        texto += direccion;
        texto += `*🧾 TICKET DE COMPRA*%0A`;
        texto += `------------------------------------------%0A`;
        texto += `*👤 Cliente:* ${nombreCliente}%0A`;
        texto += `*📅 Fecha:* ${fecha}%0A`;
        texto += `------------------------------------------%0A%0A`;

        texto += `*DETALLE DE PRODUCTOS:*%0A`;
        items.forEach(item => {
            const subtotal = item.price * item.quantity;
            texto += `▪️ ${item.quantity} x ${item.productName}%0A`;
            texto += `   Subtotal: *$${subtotal.toLocaleString('es-AR')}*%0A`;
        });

        texto += `%0A------------------------------------------%0A`;
        texto += `*💰 TOTAL DE LA VENTA: $${total}*%0A`;
        texto += `------------------------------------------%0A%0A`;
        texto += `_${mensajePersonalizado}_ 🙏`;

        window.open(`https://wa.me/?text=${texto}`, '_blank');

    } catch (err) {
        console.error("Error en WhatsApp:", err);
        Swal.fire('Error', 'No se pudo generar el ticket', 'error');
    }
};

// ==========================================
// 4. LÓGICA DE CLIENTES
// ==========================================

async function cargarClientes() {
    try {
        const resp = await fetch(API_CUSTOMERS, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const clientes = await resp.json();
        renderizarClientes(clientes);
    } catch (err) {
        console.error("Error cargando clientes", err);
    }
}

function renderizarClientes(clientes) {
    const tbody = document.getElementById('tablaClientes');
    tbody.innerHTML = '';
    let totalDeuda = 0;

    clientes.forEach(c => {
        totalDeuda += c.currentBalance;
        const colorSaldo = c.currentBalance > 0 ? 'text-danger' : 'text-success';

        const msgWsCaja = `Hola ${c.name}, te recordamos tu saldo pendiente de $${c.currentBalance.toLocaleString('es-AR')}. Saludos de ${DATOS_EMPRESA ? DATOS_EMPRESA.name : 'BaezPOS'}!`;
        const linkWs = c.phone ? `https://wa.me/${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msgWsCaja)}` : '#';
        const clienteData = encodeURIComponent(JSON.stringify(c));

        tbody.innerHTML += `
            <tr>
                <td class="fw-bold text-dark">${c.name}</td>
                <td class="text-muted small">${c.dniCuit || '-'}</td>
                <td>
                    ${c.phone ?
                        `<a href="${linkWs}" target="_blank" class="badge bg-success bg-opacity-10 text-success text-decoration-none">
                            <i class="bi bi-whatsapp"></i> ${c.phone}
                        </a>` :
                        '<span class="text-muted small">Sin tel.</span>'
                    }
                </td>
                <td class="${colorSaldo} fw-bold">$${c.currentBalance.toLocaleString('es-AR')}</td>
                <td class="text-center">
                    <div class="btn-group">
                        <button class="btn btn-sm btn-light border-0" onclick="abrirModalEditar('${clienteData}')" title="Editar">
                            <i class="bi bi-pencil-square text-warning"></i>
                        </button>
                        <button class="btn btn-sm btn-light border-0" onclick="verHistorial(${c.id}, '${c.name}')" title="Ver Libreta">
                            <i class="bi bi-journal-text text-primary"></i>
                        </button>
                        <button class="btn btn-sm btn-light border-0" onclick="registrarPago(${c.id})" title="Cobrar">
                            <i class="bi bi-cash-stack text-success"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    });
    document.getElementById('totalDeudaClientes').innerText = `$${totalDeuda.toLocaleString('es-AR')}`;
}

async function verHistorial(id, nombre) {
    try {
        const resp = await fetch(`${API_CUSTOMERS}/${id}/movements`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const movs = await resp.json();

        document.getElementById('historialTitulo').innerText = `Libreta: ${nombre}`;
        const tbody = document.getElementById('listaMovimientos');
        tbody.innerHTML = '';

        let saldoAcumulado = 0;

        movs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)).forEach((m, index) => {
            const esVenta = m.type === 'SALE' || m.type === 'DEBITO';
            const fecha = new Date(m.createdAt).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

            if (esVenta) saldoAcumulado += m.amount;
            else saldoAcumulado -= m.amount;

            const filaPrincipal = `
                <tr class="align-middle" style="cursor: pointer;" onclick="toggleDetalle(${index})">
                    <td class="ps-4 text-muted" style="font-size: 0.75rem;">${fecha}</td>
                    <td>
                        <span class="fw-bold text-dark">${m.description}</span>
                        ${esVenta ? `<i id="icon-${index}" class="bi bi-chevron-down ms-2 text-primary small"></i>` : ''}
                    </td>
                    <td class="text-end text-danger fw-bold">${esVenta ? '+$' + m.amount.toLocaleString('es-AR') : ''}</td>
                    <td class="text-end text-success fw-bold">${!esVenta ? '-$' + m.amount.toLocaleString('es-AR') : ''}</td>
                    <td class="pe-4 text-end fw-bold text-secondary">$${saldoAcumulado.toLocaleString('es-AR')}</td>
                </tr>
            `;

            let detalleHtml = '';
            if (esVenta) {
                let itemsLista = '<p class="text-muted small">Detalle de productos no disponible.</p>';
                let totalTicket = 0;

                if (m.itemsDetail && m.itemsDetail.length > 0) {
                    itemsLista = m.itemsDetail.map(i => {
                        const subtotal = i.price * i.quantity;
                        totalTicket += subtotal;
                        return `
                            <div class="d-flex justify-content-between border-bottom py-1">
                                <span>${i.quantity}x ${i.productName}</span>
                                <span class="fw-bold">$${subtotal.toLocaleString('es-AR')}</span>
                            </div>
                        `;
                    }).join('');

                    itemsLista += `
                        <div class="d-flex justify-content-between pt-2 mt-1 border-top border-dark">
                            <span class="fw-bold text-dark text-uppercase">Total Ticket:</span>
                            <span class="fw-bold text-primary fs-5">$${totalTicket.toLocaleString('es-AR')}</span>
                        </div>
                    `;
                }

                detalleHtml = `
                    <tr id="detalle-${index}" class="d-none bg-light">
                        <td colspan="5" class="p-3">
                            <div class="card card-body border-0 shadow-sm mx-4" style="background-color: #fdfdfd; border-left: 4px solid #1e3a8a !important;">
                                <h6 class="small fw-bold text-primary mb-3"><i class="bi bi-box-seam me-1"></i> DETALLE DE COMPRA:</h6>
                                ${itemsLista}
                                ${m.itemsDetail ? `
                                <div class="text-end mt-3">
                                    <button class="btn btn-sm btn-success px-3 shadow-sm" onclick="event.stopPropagation(); compartirWhatsApp('${nombre}', '${fecha}', '${totalTicket.toLocaleString('es-AR')}', '${encodeURIComponent(JSON.stringify(m.itemsDetail))}')">
                                        <i class="bi bi-whatsapp me-1"></i> Enviar ticket a ${nombre}
                                    </button>
                                </div>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            }
            tbody.innerHTML += filaPrincipal + detalleHtml;
        });

        document.getElementById('historialSubtitulo').innerText = `Deuda pendiente: $${saldoAcumulado.toLocaleString('es-AR')}`;
        const modal = new bootstrap.Modal(document.getElementById('modalHistorialCliente'));
        modal.show();
    } catch (err) {
        console.error("Error cargando historial", err);
    }
}

// ==========================================
// 5. ABM Y FILTROS
// ==========================================

async function registrarPago(id) {
    const { value: monto } = await Swal.fire({
        title: 'Cobrar Saldo',
        input: 'number',
        inputLabel: '¿Cuánto entrega el cliente?',
        showCancelButton: true,
        confirmButtonText: 'Registrar Cobro',
        cancelButtonText: 'Cancelar'
    });

    if (monto) {
        try {
            const resp = await fetch(`${API_CUSTOMERS}/${id}/payments`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify(parseFloat(monto))
            });
            if (resp.ok) {
                Swal.fire('¡Cobrado!', 'El saldo del cliente se actualizó correctamente.', 'success');
                cargarClientes();
            }
        } catch (err) {
            Swal.fire('Error', 'No se pudo registrar el pago', 'error');
        }
    }
}

function abrirModalNuevoCliente() {
    document.getElementById('formNuevoCliente').reset();
    document.getElementById('custId').value = '';
    document.getElementById('modalClienteTitulo').innerText = 'Nuevo Cliente';
    modalInstance = new bootstrap.Modal(document.getElementById('modalNuevoCliente'));
    modalInstance.show();
}

function abrirModalEditar(clienteEncoded) {
    const cliente = JSON.parse(decodeURIComponent(clienteEncoded));
    document.getElementById('modalClienteTitulo').innerText = 'Editar Cliente';
    document.getElementById('custId').value = cliente.id;
    document.getElementById('custNombre').value = cliente.name;
    document.getElementById('custDni').value = cliente.dniCuit || '';
    document.getElementById('custTel').value = cliente.phone || '';
    document.getElementById('custLimite').value = cliente.creditLimit;

    modalInstance = new bootstrap.Modal(document.getElementById('modalNuevoCliente'));
    modalInstance.show();
}

async function guardarCliente() {
    const id = document.getElementById('custId').value;
    const data = {
        name: document.getElementById('custNombre').value,
        dniCuit: document.getElementById('custDni').value,
        phone: document.getElementById('custTel').value,
        creditLimit: parseFloat(document.getElementById('custLimite').value) || 0
    };

    if (!data.name) return Swal.fire('Error', 'El nombre es obligatorio', 'warning');

    const url = id ? `${API_CUSTOMERS}/${id}` : API_CUSTOMERS;
    const method = id ? 'PUT' : 'POST';

    try {
        const resp = await fetch(url, {
            method: method,
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            modalInstance.hide();
            Swal.fire('¡Éxito!', 'Cliente guardado correctamente.', 'success');
            cargarClientes();
        }
    } catch (err) {
        console.error("Error al guardar cliente", err);
    }
}

function filtrarClientes() {
    const texto = document.getElementById('buscarCliente').value.toLowerCase();
    const soloDeudores = document.getElementById('filtroDeudores').checked;
    const filas = document.querySelectorAll('#tablaClientes tr');

    filas.forEach(fila => {
        const nombre = fila.cells[0].innerText.toLowerCase();
        const dni = fila.cells[1].innerText.toLowerCase();
        const saldoTexto = fila.cells[3].innerText.replace('$', '').replace(/\./g, '').replace(',', '.');
        const saldo = parseFloat(saldoTexto) || 0;

        const coincideTexto = nombre.includes(texto) || dni.includes(texto);
        const cumpleDeuda = !soloDeudores || saldo > 0;

        fila.style.display = (coincideTexto && cumpleDeuda) ? '' : 'none';
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