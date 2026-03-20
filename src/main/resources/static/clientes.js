const API_CUSTOMERS = "http://localhost:8080/api/v1/customers";
const token = localStorage.getItem('baezpos_token');
let modalInstance;

// 1. FUNCIÓN GLOBAL PARA MOSTRAR/OCULTAR (Debe estar afuera para que el HTML la vea)
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

// 2. FUNCIÓN GLOBAL PARA WHATSAPP
window.compartirWhatsApp = function(nombre, fecha, total, itemsJson) {
    // Usamos los datos cargados por inicializarIdentidad()
    const nombreLocal = datosNegocio ? datosNegocio.name : "Nuestro Negocio";
    const mensajeFinal = datosNegocio ? datosNegocio.ticketMessage : "¡Gracias!";

    let texto = `*${nombreLocal} - Resumen de Compra*%0A`;
    texto += `Hola ${nombre}, detalle de tu compra del ${fecha}:%0A%0A`;

    // ... (tu lógica de items) ...

    texto += `%0A*TOTAL: $${total}*%0A`;
    texto += `_${mensajeFinal}_`;

    window.open(`https://wa.me/?text=${texto}`, '_blank');
};

document.addEventListener('DOMContentLoaded', () => {
    if (!token) window.location.href = 'index.html';
    cargarClientes();
});

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

        // Link de WhatsApp
        const msgWs = `Hola ${c.name}, te recordamos tu saldo pendiente de $${c.currentBalance.toLocaleString('es-AR')}. Saludos de BaezPOS!`;
        const linkWs = c.phone ? `https://wa.me/${c.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msgWs)}` : '#';

        // Escapamos el objeto cliente para el botón editar
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
                    <button class="btn btn-sm btn-light border-0 me-1" onclick="abrirModalEditar('${clienteData}')" title="Editar Datos">
                        <i class="bi bi-pencil-square text-warning"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0 me-1" onclick="verHistorial(${c.id}, '${c.name}')" title="Ver Libreta">
                        <i class="bi bi-journal-text text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-light border-0" onclick="registrarPago(${c.id})" title="Cobrar">
                        <i class="bi bi-cash-stack text-success"></i>
                    </button>
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

            // FILA DE MOVIMIENTO
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

                    // Agregamos la fila del TOTAL al final de la lista de productos
                    itemsLista += `
                        <div class="d-flex justify-content-between pt-2 mt-1 border-top border-dark">
                            <span class="fw-bold text-dark text-uppercase">Total del Ticket:</span>
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
                                        <i class="bi bi-whatsapp me-1"></i> Enviar ticket a Silvia
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

// Otras funciones auxiliares...
async function registrarPago(id) {
    const { value: monto } = await Swal.fire({
        title: 'Entrada de Dinero',
        input: 'number',
        inputLabel: '¿Cuánto paga el cliente?',
        showCancelButton: true
    });

    if (monto) {
        const resp = await fetch(`${API_CUSTOMERS}/${id}/payments`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(parseFloat(monto))
        });
        if (resp.ok) {
            Swal.fire('Éxito', 'Saldo actualizado', 'success');
            cargarClientes();
        }
    }
}

function abrirModalNuevoCliente() {
    document.getElementById('formNuevoCliente').reset();
    modalInstance = new bootstrap.Modal(document.getElementById('modalNuevoCliente'));
    modalInstance.show();
}

async function guardarCliente() {
    const id = document.getElementById('custId').value;
    const data = {
        name: document.getElementById('custNombre').value,
        dniCuit: document.getElementById('custDni').value,
        phone: document.getElementById('custTel').value,
        creditLimit: parseFloat(document.getElementById('custLimite').value)
    };

    if (!data.name) return Swal.fire('Error', 'El nombre es obligatorio', 'warning');

    // Si hay ID usamos PUT para editar, si no POST para crear
    const url = id ? `${API_CUSTOMERS}/${id}` : API_CUSTOMERS;
    const method = id ? 'PUT' : 'POST';

    try {
        const resp = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            modalInstance.hide();
            Swal.fire('¡Éxito!', id ? 'Cliente actualizado' : 'Cliente registrado', 'success');
            cargarClientes();
        } else {
            Swal.fire('Error', 'No se pudo guardar la información', 'error');
        }
    } catch (err) {
        console.error("Error al guardar cliente", err);
    }
}

function abrirModalNuevoCliente() {
    document.getElementById('formNuevoCliente').reset();
    document.getElementById('custId').value = ''; // Limpiamos el ID
    document.getElementById('modalClienteTitulo').innerText = 'Nuevo Cliente';
    modalInstance = new bootstrap.Modal(document.getElementById('modalNuevoCliente'));
    modalInstance.show();
}

function abrirModalEditar(clienteEncoded) {
    // Decodificamos la data que viene del botón
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

function filtrarClientes() {
    const texto = document.getElementById('buscarCliente').value.toLowerCase();
    const soloDeudores = document.getElementById('filtroDeudores').checked;
    const filas = document.querySelectorAll('#tablaClientes tr');

    filas.forEach(fila => {
        const nombre = fila.cells[0].innerText.toLowerCase();
        const dni = fila.cells[1].innerText.toLowerCase();

        // Obtenemos el saldo: quitamos el "$" y los puntos de miles para poder comparar el número
        const saldoTexto = fila.cells[3].innerText.replace('$', '').replace(/\./g, '').replace(',', '.');
        const saldo = parseFloat(saldoTexto) || 0;

        // Condición 1: ¿Coincide el texto buscado?
        const coincideTexto = nombre.includes(texto) || dni.includes(texto);

        // Condición 2: Si el switch está activo, ¿el saldo es mayor a 0?
        const cumpleDeuda = !soloDeudores || saldo > 0;

        if (coincideTexto && cumpleDeuda) {
            fila.style.display = '';
        } else {
            fila.style.display = 'none';
        }
    });
}