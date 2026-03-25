const API_BASE = 'http://localhost:8080/api/v1/sales';
const API_PRODUCTS = 'http://localhost:8080/api/v1/products';
const API_CUSTOMERS = 'http://localhost:8080/api/v1/customers';
const token = localStorage.getItem('baezpos_token');
const companyId = localStorage.getItem('baezpos_company_id');

// --- CORRECCIÓN AQUÍ: Solo una vez y con /status al final ---
const API_STATUS = 'http://localhost:8080/api/v1/admin/my-company/status';

// --- EL CANDADO DE ALEXANDER ---
let sistemaBloqueado = false;
const MI_WHATSAPP = "5492645468570";
let mensajeTicketServidor = "";

// RECURSOS DE AUDIO
const sndSuccess = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
const sndError = new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3');

let PRODUCTOS_DB = [];
let CARRITO = [];
let METODO_PAGO = 'EFECTIVO';
let SUBTOTAL_VENTA = 0;
let DESCUENTO_FINAL_PESOS = 0;
let clienteSeleccionado = null;
let indiceSeleccionado = -1;


document.addEventListener('DOMContentLoaded', async () => {
    if (!token) { window.location.href = 'login.html'; return; }
    await chequearEstadoLicencia();
    await cargarProductos();


    const buscador = document.getElementById('buscadorVenta');
    const sugerenciasDiv = document.getElementById('listaSugerencias');

    if (buscador) {
        buscador.focus();

        // Buscador Reactivo de Productos
        buscador.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase().trim();
            indiceSeleccionado = -1;
            if (term.length === 0) {
                sugerenciasDiv.style.display = 'none';
                return;
            }
            const filtrados = PRODUCTOS_DB.filter(p =>
                (p.name && p.name.toLowerCase().includes(term)) ||
                (p.barcode && p.barcode.includes(term))
            ).slice(0, 8);
            renderizarSugerencias(filtrados);
        });

        // Navegación por teclado (Flechas y Enter)
        buscador.addEventListener('keydown', (e) => {
            const items = sugerenciasDiv.querySelectorAll('.list-group-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                indiceSeleccionado = (indiceSeleccionado + 1) % items.length;
                actualizarFocoSugerencia(items);
            }
            else if (e.key === 'ArrowUp') {
                e.preventDefault();
                indiceSeleccionado = (indiceSeleccionado - 1 + items.length) % items.length;
                actualizarFocoSugerencia(items);
            }
            else if (e.key === 'Enter') {
                e.preventDefault();
                if (indiceSeleccionado > -1 && items[indiceSeleccionado]) {
                    items[indiceSeleccionado].click();
                } else {
                    const term = buscador.value.toLowerCase().trim();
                    const p = PRODUCTOS_DB.find(prod =>
                        (prod.barcode && prod.barcode.toLowerCase() === term) ||
                        (prod.name && prod.name.toLowerCase() === term)
                    );
                    if (p) seleccionarProducto(p);
                }
                sugerenciasDiv.style.display = 'none';
            }
        });
    }

    // --- BUSCADOR DE CLIENTES (AGREGADO AQUÍ) ---
    const buscadorCli = document.getElementById('buscarClientePos');
    if (buscadorCli) {
        buscadorCli.addEventListener('input', async (e) => {
            const term = e.target.value.trim();
            const sugCli = document.getElementById('sugerenciasClientes');
            if (term.length < 2) { sugCli.style.display = 'none'; return; }

            try {
                const res = await fetch(`${API_CUSTOMERS}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const todos = await res.json();
                const filtrados = todos.filter(c =>
                    c.name.toLowerCase().includes(term.toLowerCase())
                ).slice(0, 5);

                sugCli.innerHTML = filtrados.map(c => `
                    <button type="button" class="list-group-item list-group-item-action small" onclick='seleccionarCliente(${JSON.stringify(c)})'>
                        <div class="d-flex justify-content-between">
                            <span>${c.name}</span>
                            <span class="text-danger fw-bold">$${c.currentBalance.toFixed(2)}</span>
                        </div>
                    </button>
                `).join('');
                sugCli.style.display = filtrados.length > 0 ? 'block' : 'none';
            } catch (err) { console.error("Error buscando clientes", err); }
        });
    }

    // Listeners de Interfaz
    const inputPagaCon = document.getElementById('pagaCon');
    if (inputPagaCon) inputPagaCon.addEventListener('input', calcularVuelto);

    const inputDesc = document.getElementById('inputDescuento');
    if (inputDesc) inputDesc.addEventListener('input', renderizarCarrito);

    const tipoDesc = document.getElementById('tipoDescuento');
    if (tipoDesc) tipoDesc.addEventListener('change', renderizarCarrito);

    // Atajos Globales (F12, F4, F2, F8, Escape)
    document.addEventListener('keydown', (e) => {
        if (e.key === 'F12') { e.preventDefault(); finalizarVenta(); }
        if (e.key === 'F4') { e.preventDefault(); document.getElementById('pagaCon').focus(); }
        if (e.key === 'F2') { e.preventDefault(); cancelarVenta(); }
        if (e.key === 'Escape') {
            document.getElementById('buscadorVenta').focus();
            sugerenciasDiv.style.display = 'none';
            if(document.getElementById('sugerenciasClientes')) {
                document.getElementById('sugerenciasClientes').style.display = 'none';
            }
        }
        if (e.key === 'F8') { e.preventDefault(); agregarProductoManual(); }
    });
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

function actualizarFocoSugerencia(items) {
    items.forEach((item, index) => {
        if (index === indiceSeleccionado) {
            item.classList.add('active');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('active');
        }
    });
}
// 1. FUNCIÓN DE CARGA (CORREGIDA)
async function cargarProductos() {
    try {
        const res = await fetch(API_PRODUCTS, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // --- SI EL FILTRO DE JAVA TIRA 403 (CUENTA DESACTIVADA) ---
        if (res.status === 403) {
            bloquearSistemaPorFaltaDePago();
            return;
        }

        if (res.status === 401) {
            localStorage.removeItem('baezpos_token');
            window.location.href = 'login.html?error=expired';
            return;
        }

        if (!res.ok) throw new Error("Error al obtener productos");

        PRODUCTOS_DB = await res.json();

    } catch (err) {
        console.error("Error de conexión:", err);
    }
}

async function buscarYAgregar(query) {
    console.log("🚀 Función buscarYAgregar iniciada con:", query);
    if (!query) return;
    const term = query.toLowerCase().trim();

    // VALIDACIÓN DE SEGURIDAD: ¿Existe la base de datos local?
    if (typeof PRODUCTOS_DB === 'undefined') {
        console.error("❌ ERROR: PRODUCTOS_DB no está definida en ventas.js");
        PRODUCTOS_DB = []; // La creamos vacía para que no rompa el resto
    }

    const p = PRODUCTOS_DB.find(prod =>
        (prod.barcode && prod.barcode.toLowerCase() === term) ||
        (prod.name && prod.name.toLowerCase().includes(term))
    );

    if (p) {
        console.log("✅ Producto encontrado localmente");
        seleccionarProducto(p);
    } else {
        console.log("🔍 No está en DB local, buscando en API externa...");

        if (/^\d{7,14}$/.test(term)) {
            try {
                const response = await fetch(`https://world.openfoodfacts.org/api/v2/product/${term}.json?fields=product_name,product_name_es,brands,quantity`);
                const data = await response.json();
                console.log("📦 Respuesta de la API:", data);

                if (data.status === 1 && data.product) {
                    const nombreAPI = data.product.product_name_es || data.product.product_name || "";
                    const marcaAPI = data.product.brands || "";
                    const cantidadAPI = data.product.quantity || "";
                    const nombreFinalParaEnviar = `${nombreAPI} ${marcaAPI} ${cantidadAPI}`.trim().toUpperCase();

                    Swal.fire({
                        icon: 'info',
                        title: '¡Encontrado en la Red!',
                        html: `<b>${nombreFinalParaEnviar}</b><br><br>¿Cargar al sistema?`,
                        showCancelButton: true,
                        confirmButtonText: 'Sí, ir a cargar'
                    }).then((result) => {
                        if (result.isConfirmed) {
                            window.location.href = `productos.html?nuevoCodigo=${term}&nuevoNombre=${encodeURIComponent(nombreFinalParaEnviar)}`;
                        }
                    });
                    return;
                }
            } catch (err) {
                console.error("❌ Error fetch API:", err);
            }
        }

        // Si llegó acá es porque no lo encontró en ningún lado
        console.log("❌ No se encontró en ningún lado, abriendo aviso de carga manual.");
        Swal.fire({
            icon: 'error',
            title: 'No encontrado',
            text: `El código ${term} no existe. ¿Cargar manual?`,
            showCancelButton: true,
            confirmButtonText: 'Cargar ahora'
        }).then((result) => {
            if (result.isConfirmed) {
                window.location.href = `productos.html?nuevoCodigo=${term}`;
            }
        });
    }

    const buscador = document.getElementById('buscadorVenta');
    if (buscador) { buscador.value = ''; buscador.focus(); }
}

function renderizarCarrito() {
    const body = document.getElementById('carritoBody');
    if (!body) return;
    body.innerHTML = '';
    SUBTOTAL_VENTA = 0;

    CARRITO.forEach((item, index) => {
        const subtotal = item.price * item.cantidad;
        SUBTOTAL_VENTA += subtotal;

        // Uso de toLocaleString para formato profesional con puntos y comas
        const precioFmt = item.price.toLocaleString('es-AR', { minimumFractionDigits: 2 });
        const subtotalFmt = subtotal.toLocaleString('es-AR', { minimumFractionDigits: 2 });

        body.innerHTML += `
            <tr class="animate__animated animate__fadeIn">
                <td>
                    <div class="fw-bold">${item.name}</div>
                    <small class="text-muted text-uppercase" style="font-size: 0.7rem;">${item.barcode || 'S/C'}</small>
                </td>
                <td class="text-center">
                    <div class="btn-group btn-group-sm border rounded-pill overflow-hidden bg-white shadow-sm">
                        <button class="btn btn-light border-0 px-2" onclick="cambiarCant(${index}, -1)"><i class="bi bi-dash"></i></button>
                        <span class="btn btn-white border-0 disabled fw-bold" style="min-width: 45px">${item.cantidad}</span>
                        <button class="btn btn-light border-0 px-2" onclick="cambiarCant(${index}, 1)"><i class="bi bi-plus"></i></button>
                    </div>
                </td>
                <td class="text-end text-muted">$${precioFmt}</td>
                <td class="text-end fw-bold text-dark">$${subtotalFmt}</td>
                <td class="text-end">
                    <button class="btn btn-link text-danger p-0" onclick="eliminarItem(${index})">
                        <i class="bi bi-trash3 fs-6"></i>
                    </button>
                </td>
            </tr>`;
    });

    // Lógica de Descuento
    const inputDesc = document.getElementById('inputDescuento');
    const tipoDesc = document.getElementById('tipoDescuento');
    let valorIngresado = parseFloat(inputDesc?.value) || 0;

    if (tipoDesc && tipoDesc.value === 'PORCENTAJE') {
        DESCUENTO_FINAL_PESOS = SUBTOTAL_VENTA * (valorIngresado / 100);
    } else {
        DESCUENTO_FINAL_PESOS = valorIngresado;
    }

    // Evitar descuentos mayores al total
    if (DESCUENTO_FINAL_PESOS > SUBTOTAL_VENTA) DESCUENTO_FINAL_PESOS = SUBTOTAL_VENTA;

    const totalConDescuento = SUBTOTAL_VENTA - DESCUENTO_FINAL_PESOS;

    // Renderizado de totales finales
    document.getElementById('totalVenta').innerText = `$${totalConDescuento.toLocaleString('es-AR', { minimumFractionDigits: 2 })}`;

    calcularVuelto();

    // --- MEJORA DE FOCO INTELIGENTE ---
    // Solo devolvemos el foco al buscador si el usuario NO está editando descuento o pago
    const activeEl = document.activeElement.id;
    if (activeEl !== 'pagaCon' && activeEl !== 'inputDescuento') {
        document.getElementById('buscadorVenta').focus();
    }
}

function calcularVuelto() {
    // 1. Obtenemos el texto del total (ejemplo: "$3.000,00")
    let totalText = document.getElementById('totalVenta').innerText;

    // 2. LIMPIEZA TOTAL:
    // Quitamos el "$", quitamos los puntos de miles y cambiamos la coma por punto
    let totalLimpio = totalText.replace('$', '')     // Quita el signo peso
                               .replace(/\./g, '')    // Quita los puntos de MILES
                               .replace(',', '.');    // Cambia la coma decimal por PUNTO

    const total = parseFloat(totalLimpio) || 0;

    // 3. Obtenemos cuánto paga el cliente
    const pagaCon = parseFloat(document.getElementById('pagaCon').value) || 0;

    // 4. Cálculo del vuelto
    const vuelto = pagaCon - total;
    const txtVuelto = document.getElementById('vueltoVenta');

    if (txtVuelto) {
        if (vuelto < 0 || pagaCon === 0) {
            txtVuelto.innerText = "$0.00";
            txtVuelto.classList.remove('text-success');
            txtVuelto.classList.add('text-danger');
        } else {
            // Mostramos el vuelto con formato lindo
            txtVuelto.innerText = `$${vuelto.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            txtVuelto.classList.remove('text-danger');
            txtVuelto.classList.add('text-success');
        }
    }
}

function cambiarCant(index, valor) {
    const item = CARRITO[index];
    const original = PRODUCTOS_DB.find(p => p.id === item.id);
    if (valor > 0 && item.cantidad >= original.stock) {
        if(sndError) sndError.play().catch(()=>{});
        Swal.fire({ icon: 'info', title: 'Límite alcanzado', text: 'No hay más unidades en stock', toast: true, position: 'top-end', timer: 2000, showConfirmButton: false });
        return;
    }
    item.cantidad += valor;
    if (item.cantidad <= 0) CARRITO.splice(index, 1);
    renderizarCarrito();
}

function eliminarItem(index) {
    CARRITO.splice(index, 1);
    renderizarCarrito();
}

function setMetodo(metodo, el) {
    METODO_PAGO = metodo;
    document.querySelectorAll('.metodo-pago').forEach(d => d.classList.remove('active'));
    el.classList.add('active');

    const divCli = document.getElementById('seccionClienteFiado');
    const divVue = document.getElementById('seccionVuelto');

    if (metodo === 'CUENTA_CORRIENTE') {
        divCli.classList.remove('d-none');
        divVue.classList.add('d-none');
        document.getElementById('buscarClientePos').focus();
    } else {
        divCli.classList.add('d-none');
        divVue.classList.remove('d-none');
        clienteSeleccionado = null;
        if (metodo === 'TRANSFERENCIA') {
            const total = document.getElementById('totalVenta').innerText.replace('$', '');
            document.getElementById('pagaCon').value = total;
            calcularVuelto();
        } else {
            document.getElementById('pagaCon').value = '';
        }
    }
    document.getElementById('buscadorVenta').focus();
}

function cancelarVenta() {
    if (CARRITO.length === 0) return;
    CARRITO = [];
    document.getElementById('pagaCon').value = '';
    const inputDesc = document.getElementById('inputDescuento');
    if (inputDesc) inputDesc.value = '';
    renderizarCarrito();
}

async function finalizarVenta() {

    if (sistemaBloqueado) {
            mostrarCartelBloqueo();
            return;
        }


    if (CARRITO.length === 0) {
        Swal.fire('Carrito vacío', 'Agrega productos para cobrar', 'info');
        return;
    }

    const totalText = document.getElementById('totalVenta').innerText.replace('$', '');
    const total = parseFloat(totalText);
    const pagaCon = parseFloat(document.getElementById('pagaCon').value) || 0;

    // VALIDACIÓN: Efectivo insuficiente
    if (METODO_PAGO === 'EFECTIVO' && pagaCon < total) {
        Swal.fire('Atención', 'El monto recibido es insuficiente', 'warning');
        return;
    }

    // VALIDACIÓN: Cuenta Corriente (Libreta)
    if (METODO_PAGO === 'CUENTA_CORRIENTE') {
        if (!clienteSeleccionado) {
            Swal.fire('Atención', 'Debes seleccionar un cliente para vender a la libreta', 'warning');
            return;
        }
        // Validar si la deuda actual + esta venta supera el límite permitido
        if ((clienteSeleccionado.currentBalance + total) > clienteSeleccionado.creditLimit) {
            Swal.fire({
                icon: 'error',
                title: 'Límite de Crédito Excedido',
                text: `El cliente no puede deber más de $${clienteSeleccionado.creditLimit}. Saldo actual: $${clienteSeleccionado.currentBalance.toFixed(2)}`
            });
            return;
        }
    }

    const saleRequestDTO = {
        items: CARRITO.map(item => ({
            productId: item.id,
            quantity: item.cantidad,
            price: item.price
        })),
        discount: DESCUENTO_FINAL_PESOS || 0,
        paymentMethod: METODO_PAGO,
        customerId: clienteSeleccionado ? clienteSeleccionado.id : null // Se envía el ID si es libreta
    };

    const btnFinalizar = document.querySelector('.btn-primary.btn-lg.w-100.py-3');
    if (btnFinalizar) btnFinalizar.disabled = true;

    try {
        const res = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(saleRequestDTO)
        });

        let data = {};
        const contentType = res.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            data = await res.json();
        }

        if (res.ok) {
            // REPRODUCIR SONIDO DE ÉXITO
            if(window.sndSuccess) window.sndSuccess.play().catch(()=>{});

            // LÓGICA DE CONFIRMACIÓN E IMPRESIÓN
            Swal.fire({
                icon: 'success',
                title: '¡Venta Realizada!',
                text: METODO_PAGO === 'CUENTA_CORRIENTE'
                    ? `Cargado a la cuenta de ${clienteSeleccionado.name} (Op #${data.id})`
                    : `Operación #${data.id || 'Exitosa'}`,
                showCancelButton: true,
                confirmButtonText: '<i class="bi bi-printer"></i> Imprimir Ticket',
                cancelButtonText: 'No imprimir',
                confirmButtonColor: '#28a745',
                cancelButtonColor: '#6c757d',
                reverseButtons: true
            }).then((result) => {
                if (result.isConfirmed) {
                    if (typeof imprimirTicket === 'function') {
                        imprimirTicket(data);
                    }
                }
            });

            // LIMPIEZA DE INTERFAZ
            CARRITO = [];
            clienteSeleccionado = null; // Reset del cliente seleccionado

            // Ocultar el panel de info del cliente si existe
            const infoCli = document.getElementById('infoClienteSeleccionado');
            if(infoCli) infoCli.classList.add('d-none');

            document.getElementById('pagaCon').value = '';
            const inputDesc = document.getElementById('inputDescuento');
            if (inputDesc) inputDesc.value = '';

            renderizarCarrito();
            await cargarProductos(); // Refrescar stock tras la venta

        } else {
            throw new Error(data.message || "Error al procesar la venta");
        }
    } catch (err) {
        console.error(err);
        if(window.sndError) window.sndError.play().catch(()=>{});
        Swal.fire('Error', err.message, 'error');
    } finally {
        if (btnFinalizar) btnFinalizar.disabled = false;
        document.getElementById('buscadorVenta').focus();
    }
}

function imprimirTicket(venta) {
    const ventana = window.open('', 'PRINT', 'height=600,width=400');
    const fechaVenta = venta.saleDate ? new Date(venta.saleDate).toLocaleString() : new Date().toLocaleString();

    // GENERAMOS LA URL DEL QR (Contiene el ID de venta y el total para validación)
    const qrData = `Venta:${venta.id}|Total:${venta.total}`;
    const qrUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(qrData)}&choe=UTF-8`;

    ventana.document.write(`
        <html>
            <head>
                <title>Ticket #BT-${venta.id}</title>
                <style>
                    body { font-family: 'Courier New', monospace; width: 58mm; font-size: 11px; padding: 5px; margin: 0; color: #000; }
                    .text-center { text-align: center; }
                    .line { border-top: 1px dashed black; margin: 5px 0; }
                    .total { font-size: 13px; font-weight: bold; }
                    .qr-container { margin-top: 10px; text-align: center; }
                    .item-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="text-center">
                    <strong>${venta.companyName || 'BAEZ POS'}</strong><br>
                    Venta #${venta.id}<br>
                    ${fechaVenta}
                </div>
                <div class="line"></div>

                ${venta.items.map(item => `
                    <div class="item-row">
                        <span style="max-width: 75%;">${item.productName.toUpperCase()}</span>
                        <span>$${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}

                <div class="line"></div>
                ${venta.discount > 0 ? `
                    <div class="item-row" style="color: #000;">
                        <span>DESCUENTO:</span>
                        <span>-$${venta.discount.toFixed(2)}</span>
                    </div>
                    <div class="line"></div>
                ` : ''}

                <div class="total item-row">
                    <span>TOTAL:</span>
                    <span>$${venta.total.toFixed(2)}</span>
                </div>
                <div class="line"></div>

                <div class="text-center">
                    Pago: ${venta.paymentMethod || 'EFECTIVO'}<br>
                    Atendido por: ${venta.userName || 'Cajero'}
                </div>

                <div class="qr-container">
                    <img src="${qrUrl}" alt="QR Venta" style="width: 110px; height: 110px;">
                    <br><small>Comprobante no fiscal</small>
                </div>

                <div class="line"></div>
                <div class="text-center" style="font-weight: bold; margin-top: 5px;">
                    ${mensajeTicketServidor ? mensajeTicketServidor.toUpperCase() : '¡GRACIAS POR SU COMPRA!'}
                </div>
            </body>
        </html>
    `);
    ventana.document.close();
}

// Reemplazo final para que te deje buscar clientes (Silvia) y usar la carga manual
document.addEventListener('keydown', (e) => {
    const buscador = document.getElementById('buscadorVenta');
    const idActivo = document.activeElement.id;

    // LISTA BLANCA: Agregamos 'buscarClientePos' para que no te robe el foco
    const inputsLibres = ['pagaCon', 'inputDescuento', 'buscarClientePos', 'manualNombre', 'manualPrecio'];

    if (!inputsLibres.includes(idActivo)) {
        // Solo capturamos si es una letra/número y NO es un atajo de teclado (Ctrl+V, etc.)
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey) {
            if (document.activeElement !== buscador) {
                buscador.focus();
            }
        }
    }
});
function setMetodo(metodo, el) {
    METODO_PAGO = metodo;
    document.querySelectorAll('.metodo-pago').forEach(d => d.classList.remove('active'));
    el.classList.add('active');

    const divCli = document.getElementById('seccionClienteFiado');
    const divVue = document.getElementById('seccionVuelto');

    if (metodo === 'CUENTA_CORRIENTE') {
        divCli.classList.remove('d-none');
        divVue.classList.add('d-none');
        // El timeout es para asegurar que el elemento sea visible antes de darle foco
        setTimeout(() => document.getElementById('buscarClientePos').focus(), 100);
    } else {
        divCli.classList.add('d-none');
        divVue.classList.remove('d-none');
        clienteSeleccionado = null;
        document.getElementById('infoClienteSeleccionado').classList.add('d-none');

        if (metodo === 'TRANSFERENCIA') {
            const total = document.getElementById('totalVenta').innerText.replace('$', '');
            document.getElementById('pagaCon').value = total;
            calcularVuelto();
        } else {
            document.getElementById('pagaCon').value = '';
            document.getElementById('vueltoVenta').innerText = "$0.00";
        }
        document.getElementById('buscadorVenta').focus();
    }
}

// Función para agregar algo que NO está en la base de datos
function agregarProductoManual() {
    const productosSueltos = PRODUCTOS_DB.filter(p => parseFloat(p.price) === 0);

    if (productosSueltos.length === 0) {
        Swal.fire('Atención', 'No hay productos con precio $0.', 'warning');
        return;
    }

    Swal.fire({
        title: '<i class="bi bi-box-seam me-2"></i>Venta de Sueltos',
        html: `
            <div class="position-relative text-start">
                <label class="small text-muted mb-1">Buscar producto:</label>
                <input id="manualNombreBusqueda" class="swal2-input m-0 w-100" placeholder="Ej: Pan, Queso..." autocomplete="off">
                <div id="sugerenciasSueltos" class="list-group position-absolute w-100 shadow-lg d-none"
                     style="z-index: 9999; max-height: 200px; overflow-y: auto;">
                </div>
            </div>

            <div class="text-start mt-3">
                <label class="small text-muted mb-1">Monto total ($):</label>
                <input id="manualPrecio" type="number" class="swal2-input m-0 w-100" placeholder="0.00">
            </div>
        `,
        showCancelButton: true,
        confirmButtonText: 'Agregar',
        didOpen: () => {
            const inputBusqueda = document.getElementById('manualNombreBusqueda');
            const inputPrecio = document.getElementById('manualPrecio');
            const contenedorSugerencias = document.getElementById('sugerenciasSueltos');

            inputBusqueda.focus();

            inputBusqueda.addEventListener('input', () => {
                const search = inputBusqueda.value.toUpperCase();
                contenedorSugerencias.innerHTML = '';

                if (search.length > 0) {
                    const filtrados = productosSueltos.filter(p => p.name.toUpperCase().includes(search));

                    if (filtrados.length > 0) {
                        contenedorSugerencias.classList.remove('d-none');
                        filtrados.forEach(p => {
                            const btn = document.createElement('button');
                            btn.className = 'list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2';
                            btn.style.fontSize = '0.9rem';
                            btn.innerHTML = `
                                <span><i class="bi bi-tag-fill me-2 text-primary"></i>${p.name.toUpperCase()}</span>
                                <span class="badge bg-light text-dark border">${p.categoryName || 'Suelto'}</span>
                            `;
                            btn.onclick = () => {
                                inputBusqueda.value = p.name.toUpperCase();
                                contenedorSugerencias.classList.add('d-none');
                                inputPrecio.focus(); // Salto automático al precio
                            };
                            contenedorSugerencias.appendChild(btn);
                        });
                    } else {
                        contenedorSugerencias.classList.add('d-none');
                    }
                } else {
                    contenedorSugerencias.classList.add('d-none');
                }
            });

            // Cerrar sugerencias si hace clic afuera
            document.addEventListener('click', (e) => {
                if (e.target !== inputBusqueda) contenedorSugerencias.classList.add('d-none');
            });

            inputPrecio.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') Swal.clickConfirm();
            });
        },
        preConfirm: () => {
            const nombre = document.getElementById('manualNombreBusqueda').value.toUpperCase();
            const precio = parseFloat(document.getElementById('manualPrecio').value);
            const pEncontrado = productosSueltos.find(p => p.name.toUpperCase() === nombre);

            if (!nombre) return Swal.showValidationMessage('Escribí o seleccioná un producto');
            if (isNaN(precio) || precio <= 0) return Swal.showValidationMessage('Ingresá un monto válido');

            const comodin = PRODUCTOS_DB.find(p => p.barcode === 'MANUAL');

            return {
                id: pEncontrado ? pEncontrado.id : (comodin ? comodin.id : 0),
                name: nombre,
                price: precio
            };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            CARRITO.push({
                id: result.value.id,
                name: result.value.name,
                price: result.value.price,
                barcode: 'SUELTO',
                cantidad: 1
            });
            renderizarCarrito();
            if(window.sndSuccess) window.sndSuccess.play().catch(()=>{});
        }
    });
}
/**
 * Dibuja la lista de productos encontrados debajo del buscador
 */
function renderizarSugerencias(productos) {
    const div = document.getElementById('listaSugerencias');
    if (productos.length === 0) {
        div.style.display = 'none';
        return;
    }

    // Generamos el HTML para cada sugerencia
    div.innerHTML = productos.map(p => `
        <button type="button"
                class="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-3 border-bottom shadow-sm"
                onclick='seleccionarProducto(${JSON.stringify(p)})'
                style="cursor: pointer;">
            <div class="text-start">
                <div class="fw-bold text-primary mb-0">
                    <i class="bi bi-box-seam me-2"></i>${p.name.toUpperCase()}
                </div>
                <small class="text-muted">
                    Stock: <span class="badge ${p.stock > 5 ? 'bg-light text-dark' : 'bg-danger'}">${p.stock}</span>
                    | Cód: ${p.barcode || 'S/C'}
                    ${p.categoryName ? ' | <i class="bi bi-tag small"></i> ' + p.categoryName : ''}
                </small>
            </div>
            <div class="text-end">
                <span class="h6 mb-0 fw-bold text-dark">$${p.price.toFixed(2)}</span>
            </div>
        </button>
    `).join('');

    div.style.display = 'block';
}

/**
 * Agrega el producto seleccionado al carrito y limpia la interfaz de búsqueda
 */
function seleccionarProducto(p) {

   if (sistemaBloqueado) return;

    const itemEnCarrito = CARRITO.find(item => item.id === p.id);
    const cantActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;

    // 1. Validar Stock
    if (p.stock <= cantActual) {
        if(sndError) sndError.play().catch(()=>{});
        Swal.fire({
            icon: 'warning',
            title: 'Sin Stock',
            text: `No hay más unidades disponibles de ${p.name}`,
            toast: true,
            position: 'top-end',
            timer: 2500,
            showConfirmButton: false
        });
    } else {
        // 2. Feedback Sonoro y Lógica de Carrito
        if(sndSuccess) sndSuccess.play().catch(()=>{});

        if (itemEnCarrito) {
            itemEnCarrito.cantidad++;
        } else {
            CARRITO.push({
                id: p.id,
                name: p.name,
                price: p.price,
                barcode: p.barcode,
                cantidad: 1
            });
        }
        renderizarCarrito();
    }

    // 3. Limpiar Buscador y Ocultar Sugerencias
    const buscador = document.getElementById('buscadorVenta');
    const sugerencias = document.getElementById('listaSugerencias');

    buscador.value = '';
    if (sugerencias) sugerencias.style.display = 'none';

    // Devolvemos el foco al buscador para la siguiente venta/escaneo
    setTimeout(() => buscador.focus(), 50);
}
// Función nueva para elegir el cliente de la lista
function seleccionarCliente(c) {
    clienteSeleccionado = c;
    document.getElementById('idClienteSeleccionado').value = c.id;
    document.getElementById('nombreClientePos').innerText = c.name;
    document.getElementById('saldoClientePos').innerText = `$${c.currentBalance.toFixed(2)}`;
    document.getElementById('infoClienteSeleccionado').classList.remove('d-none');
    document.getElementById('sugerenciasClientes').style.display = 'none';
    document.getElementById('buscarClientePos').value = '';

    // Dentro del buscador de clientes:
    const colorSaldo = c.currentBalance >= c.creditLimit ? 'text-danger' : 'text-success';
    sugCli.innerHTML = filtrados.map(c => `
        <button ...>
            <span>${c.name}</span>
            <span class="${colorSaldo}">$${c.currentBalance.toFixed(2)}</span>
        </button>
    `).join('');

    // OPCIONAL: Devolver el foco al buscador de productos para seguir la venta
    document.getElementById('buscadorVenta').focus();
}

// EL GUARDIÁN QUE PREGUNTA AL SERVIDOR
async function chequearEstadoLicencia() {
    console.log("🔍 El Guardián de Alexander está preguntando al servidor...");
    if (sistemaBloqueado) return;

    try {
        const res = await fetch('http://localhost:8080/api/v1/admin/my-company/status', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log("📡 Respuesta del servidor - Status:", res.status);

        if (res.status === 403) {
            console.log("❌ ¡BLOQUEO DETECTADO (403)! Lanzando cartel...");
            mostrarCartelBloqueo();
            return;
        }

        if (res.ok) {
            const data = await res.json();
            console.log("✅ Datos recibidos:", data);

            // Forzamos el cartel si los datos dicen que no está activo
            if (data.active === false || data.vencido === true) {
                console.log("⚠️ Los datos indican cuenta inactiva o vencida.");
                mostrarCartelBloqueo();
            }
        }
    } catch (err) {
        console.error("🚨 Error de conexión al chequear licencia:", err);
    }
}

function mostrarCartelBloqueo() {
    sistemaBloqueado = true;

    // Bloqueo total con SweetAlert
    Swal.fire({
        title: '¡SISTEMA SUSPENDIDO!',
        html: `Tu suscripción ha vencido o tu cuenta está inactiva.<br><b>Contacta a Alexander Báez para habilitar el servicio.</b>`,
        icon: 'error',
        allowOutsideClick: false,
        allowEscapeKey: false,
        confirmButtonColor: '#25D366',
        confirmButtonText: '<i class="bi bi-whatsapp"></i> Hablar con Alexander',
    }).then((result) => {
        if (result.isConfirmed) {
            window.open(`https://wa.me/${MI_WHATSAPP}?text=Hola Alexander, mi sistema aparece como suspendido.`);
            setTimeout(mostrarCartelBloqueo, 500); // Re-lanzar para que no se escape
        }
    });

    // Limpiamos pantalla por seguridad
    CARRITO = [];
    renderizarCarrito();
}

// Ejecutar cada 30 segundos
setInterval(chequearEstadoLicencia, 30000);


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