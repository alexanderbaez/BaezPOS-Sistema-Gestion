// ==========================================
// 1. CONFIGURACIÓN Y VARIABLES GLOBALES
// ==========================================
const BASE_URL = 'http://localhost:8080/api/v1';
const API_SALES = `${BASE_URL}/sales`;
const token = localStorage.getItem('baezpos_token');

let VENTA_SELECCIONADA = null;
let VENTAS_GLOBALES = [];

// ==========================================
// 2. INICIALIZACIÓN
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'index.html';
        return;
    }

    // Configurar fechas por defecto (Hoy)
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaDesde').value = hoy;
    document.getElementById('fechaHasta').value = hoy;

    cargarVentas();
});

// ==========================================
// 3. CARGA DE DATOS (API FETCH)
// ==========================================
async function cargarVentas() {
    const desde = document.getElementById('fechaDesde').value;
    const hasta = document.getElementById('fechaHasta').value;

    if (!desde || !hasta) return;

    const url = `${API_SALES}?desde=${desde}&hasta=${hasta}`;

    try {
        const res = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!res.ok) throw new Error("Error al obtener el historial");

        const ventas = await res.json();
        VENTAS_GLOBALES = ventas;

        renderizarTabla(ventas);
        calcularResumenVisto(ventas);

    } catch (err) {
        console.error("Error:", err);
        Swal.fire({
            title: 'Error de Conexión',
            text: 'No se pudo conectar con el servidor central.',
            icon: 'error',
            confirmButtonColor: '#0d6efd'
        });
    }
}

function cargarVentasFiltradas() {
    cargarVentas();
}

// ==========================================
// 4. RENDERIZADO DE TABLA PROFESIONAL
// ==========================================
function renderizarTabla(ventas) {
    const tbody = document.getElementById('listaVentas');
    tbody.innerHTML = '';

    if (!ventas || ventas.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center p-5 text-muted">No se encontraron ventas en este período.</td></tr>';
        return;
    }

    ventas.sort((a, b) => b.id - a.id).forEach(v => {
        const estaAnulada = v.status === "ANULADA" || v.canceled;
        const nombresProductos = (v.items || []).map(i => i.productName).join(", ");

        const tr = document.createElement('tr');
        if (estaAnulada) tr.classList.add('bg-light', 'text-muted');

        tr.innerHTML = `
            <td class="ps-4 fw-bold">#${v.id} ${estaAnulada ? '<span class="badge bg-danger ms-1" style="font-size:9px">ANULADA</span>' : ''}</td>
            <td class="text-muted" style="font-size: 12px;">${new Date(v.saleDate).toLocaleString('es-AR')}</td>
            <td>
                <div class="fw-bold text-uppercase" style="font-size: 13px; color: #2c3e50;">${v.customerName || 'Consumidor Final'}</div>
                <small class="text-muted d-block text-truncate" style="max-width: 250px;">${nombresProductos}</small>
            </td>
            <td>
                <span class="badge bg-light text-dark border px-2 fw-normal">
                    <i class="bi ${v.paymentMethod === 'TRANSFERENCIA' ? 'bi-phone text-primary' : 'bi-cash-stack text-success'} me-1"></i> ${v.paymentMethod || 'EFECTIVO'}
                </span>
            </td>
            <td class="text-end text-danger fw-bold">-$${(v.discount || 0).toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            <td class="text-end fw-bold text-dark" style="font-size: 15px;">$${v.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}</td>
            <td class="text-center">
                <div class="btn-group">
                    <button class="btn btn-sm btn-white border shadow-sm btn-action-view" title="Ver Detalle">
                        <i class="bi bi-eye text-primary"></i>
                    </button>
                    <button class="btn btn-sm btn-white border shadow-sm btn-action-cancel"
                            title="Anular Venta" ${estaAnulada ? 'disabled' : ''}>
                        <i class="bi bi-x-circle text-danger"></i>
                    </button>
                </div>
            </td>
        `;

        tr.querySelector('.btn-action-view').onclick = () => verDetalle(v.id);
        tr.querySelector('.btn-action-cancel').onclick = () => confirmarAnulacion(v.id);

        tbody.appendChild(tr);
    });
}

// ==========================================
// 5. LÓGICA DE ANULACIÓN
// ==========================================
async function confirmarAnulacion(id) {
    const result = await Swal.fire({
        title: `¿Anular venta #${id}?`,
        text: "El stock se reintegrará automáticamente y esta acción no se puede deshacer.",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'Sí, anular venta',
        cancelButtonText: 'Mantener'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`${BASE_URL}/sales/${id}/cancel`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (res.ok) {
                Swal.fire('Venta Anulada', 'El stock ha sido restaurado.', 'success');
                cargarVentas();
            } else {
                const errorData = await res.json();
                Swal.fire('Error', errorData.message || 'No se pudo procesar la anulación', 'error');
            }
        } catch (err) {
            Swal.fire('Error de red', 'No hay conexión con el servidor.', 'error');
        }
    }
}

// ==========================================
// 6. VER DETALLE (MODAL TICKET)
// ==========================================
function verDetalle(idVenta) {
    const venta = VENTAS_GLOBALES.find(v => v.id === idVenta);
    if (!venta) return;

    VENTA_SELECCIONADA = venta;

    // Función auxiliar corregida para evitar errores de 'null' si el ID no existe en el HTML
    const setSafeText = (id, text) => {
        const el = document.getElementById(id);
        if (el) {
            el.innerText = text;
        }
    };

    setSafeText('txtIdVenta', venta.id);
    // Nota: Eliminamos txtFechaModal y txtClienteModal porque no están en tu HTML, evitando el error previo.

    const container = document.getElementById('contenedorItems');
    if (container) {
        container.innerHTML = '';
        let sumaSubtotales = 0;
        (venta.items || []).forEach(item => {
            sumaSubtotales += item.subtotal;
            const itemDiv = document.createElement('div');
            itemDiv.className = "d-flex justify-content-between align-items-center mb-2 border-bottom pb-2";
            itemDiv.innerHTML = `
                <div style="flex: 1;">
                    <span class="fw-bold text-uppercase" style="font-size: 12px;">${item.productName}</span><br>
                    <small class="text-muted">${item.quantity} un. x $${item.price.toLocaleString('es-AR')}</small>
                </div>
                <div class="fw-bold">$${item.subtotal.toLocaleString('es-AR', {minimumFractionDigits: 2})}</div>
            `;
            container.appendChild(itemDiv);
        });

        const descuento = venta.discount || 0;
        setSafeText('txtSubtotalModal', `$${sumaSubtotales.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
        setSafeText('txtDescuentoModal', `-$${descuento.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);
        setSafeText('txtTotalModal', `$${venta.total.toLocaleString('es-AR', {minimumFractionDigits: 2})}`);

        const metodoElement = document.getElementById('txtMetodoModal');
        if (metodoElement) {
            const metodo = venta.paymentMethod || 'EFECTIVO';
            metodoElement.innerHTML = `<i class="bi bi-info-circle me-1"></i> PAGO CON ${metodo}`;
        }
    }

    const modalElement = document.getElementById('modalDetalleVenta');
    if (modalElement) {
        const modal = new bootstrap.Modal(modalElement);
        modal.show();
    }
}

// ==========================================
// 7. RESUMEN SUPERIOR (CARDS)
// ==========================================
function calcularResumenVisto(ventas) {
    let totalEfe = 0;
    let totalTra = 0;

    ventas.forEach(v => {
        if (v.status !== "ANULADA" && !v.canceled) {
            if (v.paymentMethod === 'TRANSFERENCIA') totalTra += v.total;
            else totalEfe += v.total;
        }
    });

    const fmt = (val) => `$${val.toLocaleString('es-AR', {minimumFractionDigits: 2})}`;
    document.getElementById('resumenEfectivo').innerText = fmt(totalEfe);
    document.getElementById('resumenTransf').innerText = fmt(totalTra);
}

// ==========================================
// 8. REPORTES (PDF Y EXCEL)
// ==========================================
function exportarPDF() {
    if (VENTAS_GLOBALES.length === 0) {
        Swal.fire('Sin datos', 'No hay ventas para exportar.', 'info');
        return;
    }
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let sumaDescuentos = 0;
    const filas = [];

    VENTAS_GLOBALES.forEach(v => {
        if (v.status !== "ANULADA" && !v.canceled) {
            // Acumulamos el descuento general de la venta
            const desc = v.discount || 0;
            sumaDescuentos += desc;

            // El total (v.total) ya debería venir neto del backend,
            // pero lo sumamos según su método de pago
            if (v.paymentMethod === 'TRANSFERENCIA') {
                totalTransferencia += v.total;
            } else {
                totalEfectivo += v.total;
            }

            v.items.forEach((item, index) => {
                filas.push([
                    index === 0 ? `#${v.id}` : "",
                    item.productName,
                    item.quantity,
                    `$${item.price.toFixed(2)}`,
                    `$${item.subtotal.toFixed(2)}`,
                    index === 0 ? `-$${desc.toFixed(2)}` : "", // Mostramos el descuento en la primera fila de la venta
                    v.paymentMethod || 'EFECTIVO'
                ]);
            });
        }
    });

    doc.setFillColor(33, 37, 41);
    doc.rect(0, 0, 210, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.text("BaezPOS - Auditoría de Caja", 14, 22);
    doc.setFontSize(10);
    doc.text(`Desde: ${document.getElementById('fechaDesde').value} Hasta: ${document.getElementById('fechaHasta').value}`, 14, 32);

    doc.autoTable({
        startY: 45,
        head: [['ID', 'PRODUCTO', 'CANT', 'UNIT.', 'SUBTOT', 'DESC.', 'PAGO']],
        body: filas,
        theme: 'grid',
        headStyles: { fillColor: [13, 110, 253] },
        styles: { fontSize: 7 }
    });

    const finalY = doc.lastAutoTable.finalY + 15;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.text("BALANCE DE AUDITORÍA:", 14, finalY);

    doc.text(`(+) Total Efectivo: $${totalEfectivo.toLocaleString('es-AR')}`, 14, finalY + 8);
    doc.text(`(+) Total Transferencia/QR: $${totalTransferencia.toLocaleString('es-AR')}`, 14, finalY + 14);
    doc.setTextColor(220, 53, 69); // Rojo para descuentos
    doc.text(`(-) Total Descuentos Aplicados: $${sumaDescuentos.toLocaleString('es-AR')}`, 14, finalY + 20);

    doc.setFontSize(14);
    doc.setTextColor(13, 110, 253);
    doc.setFont(undefined, 'bold');
    doc.text(`NETO RECAUDADO EN CAJA: $${(totalEfectivo + totalTransferencia).toLocaleString('es-AR')}`, 14, finalY + 32);

    doc.save(`Auditoria_Completa_${new Date().getTime()}.pdf`);
}

function exportarExcelPro() {
    if (VENTAS_GLOBALES.length === 0) {
        Swal.fire('Atención', 'No hay datos para exportar', 'info');
        return;
    }

    let efe = 0;
    let tra = 0;
    let descTot = 0;

    const dataExcel = VENTAS_GLOBALES.map(v => {
        const isAnulada = v.status === "ANULADA" || v.canceled;
        if (!isAnulada) {
            const d = v.discount || 0;
            descTot += d;
            if (v.paymentMethod === 'TRANSFERENCIA') tra += v.total;
            else efe += v.total;
        }
        return {
            ID: v.id,
            Fecha: new Date(v.saleDate).toLocaleString('es-AR'),
            Cliente: v.customerName || 'Consumidor Final',
            Metodo: v.paymentMethod || 'EFECTIVO',
            Descuento: v.discount || 0,
            Total_Neto: v.total,
            Estado: v.status || 'ACTIVA'
        };
    });

    dataExcel.push({}); // Espacio
    dataExcel.push({ Cliente: "TOTAL DESCUENTOS:", Total_Neto: descTot });
    dataExcel.push({ Cliente: "TOTAL EFECTIVO (NETO):", Total_Neto: efe });
    dataExcel.push({ Cliente: "TOTAL TRANSFERENCIA (NETO):", Total_Neto: tra });
    dataExcel.push({ Cliente: "RECAUDACIÓN FINAL:", Total_Neto: efe + tra });

    const ws = XLSX.utils.json_to_sheet(dataExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditoria");
    XLSX.writeFile(wb, `Planilla_BaezPOS_Full.xlsx`);
}

// ==========================================
// 9. REIMPRESIÓN DE TICKET (TÉRMICO)
// ==========================================
function reimprimirTicket() {
    if (!VENTA_SELECCIONADA) return;

    const ventana = window.open('', 'PRINT', 'height=600,width=400');
    const fecha = new Date(VENTA_SELECCIONADA.saleDate).toLocaleString();

    ventana.document.write(`
        <html>
            <head>
                <style>
                    body { font-family: 'Courier New', monospace; width: 58mm; font-size: 11px; padding: 10px; margin: 0; }
                    .center { text-align: center; }
                    .bold { font-weight: bold; }
                    .hr { border-bottom: 1px dashed #000; margin: 5px 0; }
                    .row { display: flex; justify-content: space-between; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="center bold">BAEZ POS</div>
                <div class="center">Ticket #${VENTA_SELECCIONADA.id}</div>
                <div class="center">${fecha}</div>
                <div class="hr"></div>
                <div class="bold">CLIENTE: ${VENTA_SELECCIONADA.customerName || 'Consumidor Final'}</div>
                <div class="hr"></div>
                ${(VENTA_SELECCIONADA.items || []).map(item => `
                    <div class="row">
                        <span>${item.quantity} x ${item.productName.substring(0,18)}</span>
                        <span>$${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}
                <div class="hr"></div>
                <div class="row"><span>Subtotal:</span><span>$${(VENTA_SELECCIONADA.total + (VENTA_SELECCIONADA.discount || 0)).toFixed(2)}</span></div>
                <div class="row text-danger"><span>Descuento:</span><span>-$${(VENTA_SELECCIONADA.discount || 0).toFixed(2)}</span></div>
                <div class="row bold" style="font-size: 13px;"><span>TOTAL:</span><span>$${VENTA_SELECCIONADA.total.toFixed(2)}</span></div>
                <div class="hr"></div>
                <div class="center">*** GRACIAS POR SU COMPRA ***</div>
            </body>
        </html>
    `);
    ventana.document.close();
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'index.html';
}