const API_BASE = 'http://localhost:8080/api/v1/sales';
const API_PRODUCTS = 'http://localhost:8080/api/v1/products';
const API_CUSTOMERS = 'http://localhost:8080/api/v1/customers'; // <--- AGREGADA AQUÍ
const token = localStorage.getItem('baezpos_token');

// RECURSOS DE AUDIO PARA FEEDBACK PROFESIONAL
const sndSuccess = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3');
const sndError = new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3');

let PRODUCTOS_DB = [];
let CARRITO = [];
let METODO_PAGO = 'EFECTIVO';
let SUBTOTAL_VENTA = 0;
let DESCUENTO_FINAL_PESOS = 0;
let clienteSeleccionado = null; // <--- AGREGADA AQUÍ

let indiceSeleccionado = -1;

document.addEventListener('DOMContentLoaded', async () => {
    if (!token) { window.location.href = 'login.html'; return; }

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
async function cargarProductos() {
    try {
        const res = await fetch(API_PRODUCTS, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.status === 401) {
            // El token expiró o es inválido
            localStorage.removeItem('baezpos_token');
            window.location.href = 'login.html?error=expired';
            return;
        }

        PRODUCTOS_DB = await res.json();
        console.log("Productos cargados:", PRODUCTOS_DB.length);
    } catch (err) {
        console.error("Error de conexión:", err);
    }
}

function buscarYAgregar(query) {
    if (!query) return;
    const term = query.toLowerCase().trim();

    // 1. Buscamos en la base de datos local (ya cargada en PRODUCTOS_DB)
    const p = PRODUCTOS_DB.find(prod =>
        (prod.barcode && prod.barcode.toLowerCase() === term) ||
        (prod.name && prod.name.toLowerCase().includes(term))
    );

    if (p) {
        // --- CASO: EL PRODUCTO EXISTE ---
        const itemEnCarrito = CARRITO.find(item => item.id === p.id);
        const cantActual = itemEnCarrito ? itemEnCarrito.cantidad : 0;

        // Validar stock
        if (p.stock <= cantActual) {
            if(sndError) sndError.play().catch(()=>{});
            Swal.fire({ icon: 'warning', title: 'Sin Stock', text: `Solo quedan ${p.stock} unidades.`, toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
            return;
        }

        if(sndSuccess) sndSuccess.play().catch(()=>{});

        if (itemEnCarrito) {
            itemEnCarrito.cantidad++;
        } else {
            // SI ES LA PRIMERA VEZ QUE LO AGREGAMOS EN ESTA VENTA:
            CARRITO.push({
                id: p.id,
                name: p.name,
                price: p.price,
                barcode: p.barcode,
                cantidad: 1
            });
        }
        renderizarCarrito();

    } else {
        // --- CASO: EL PRODUCTO NO EXISTE EN LA DB ---
        if(sndError) sndError.play().catch(()=>{});

        Swal.fire({
            icon: 'error',
            title: '¿Producto nuevo?',
            text: `"${query}" no fue encontrado. ¿Querés cargarlo al sistema?`,
            showCancelButton: true,
            confirmButtonText: 'Sí, cargar ahora',
            cancelButtonText: 'Cerrar'
        }).then((result) => {
            if (result.isConfirmed) {
                // Redirigir a productos pasando el código por URL para ganar tiempo
                window.location.href = `productos.html?nuevoCodigo=${query}`;
            }
        });
    }

    // Limpiar input y asegurar foco
    const buscador = document.getElementById('buscadorVenta');
    buscador.value = '';
    buscador.focus();
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
    const totalText = document.getElementById('totalVenta').innerText.replace('$', '');
    const total = parseFloat(totalText) || 0;
    const pagaCon = parseFloat(document.getElementById('pagaCon').value) || 0;

    const vuelto = pagaCon - total;
    const txtVuelto = document.getElementById('vueltoVenta');

    if (txtVuelto) {
        if (vuelto < 0) {
            txtVuelto.innerText = "$0.00";
            txtVuelto.classList.remove('text-success');
            txtVuelto.classList.add('text-danger');
        } else {
            txtVuelto.innerText = `$${vuelto.toFixed(2)}`;
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

    // GENERAMOS LA URL DEL QR (Contiene el ID de venta y el total)
    const qrData = `Venta:${venta.id}|Total:${venta.total}`;
    const qrUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(qrData)}&choe=UTF-8`;

    ventana.document.write(`
        <html>
            <head>
                <style>
                    body { font-family: 'Courier New', monospace; width: 58mm; font-size: 11px; padding: 5px; margin: 0; }
                    .text-center { text-align: center; }
                    .line { border-top: 1px dashed black; margin: 5px 0; }
                    .total { font-size: 13px; font-weight: bold; }
                    .qr-container { margin-top: 10px; text-align: center; }
                </style>
            </head>
            <body onload="window.print(); window.close();">
                <div class="text-center"><strong>${venta.companyName || 'BAEZ POS'}</strong><br>Venta #${venta.id}<br>${fechaVenta}</div>
                <div class="line"></div>

                ${venta.items.map(item => `
                    <div style="display:flex; justify-content:space-between">
                        <span style="max-width: 70%;">${item.productName.toUpperCase()}</span>
                        <span>$${item.subtotal.toFixed(2)}</span>
                    </div>
                `).join('')}

                <div class="line"></div>
                ${venta.discount > 0 ? `
                    <div style="display:flex; justify-content:space-between; color: red;">
                        <span>DESCUENTO:</span>
                        <span>-$${venta.discount.toFixed(2)}</span>
                    </div>
                    <div class="line"></div>
                ` : ''}

                <div class="total" style="display:flex; justify-content:space-between">
                    <span>TOTAL:</span>
                    <span>$${venta.total.toFixed(2)}</span>
                </div>
                <div class="line"></div>

                <div class="text-center">
                    Pago: ${METODO_PAGO}<br>
                    Atendido por: ${venta.userName || 'Cajero'}
                </div>

                <div class="qr-container">
                    <img src="${qrUrl}" alt="QR Venta" style="width: 100px; height: 100px;">
                    <br><small>Escanee para validar</small>
                </div>

                <div class="line"></div>
                <div class="text-center">¡GRACIAS POR SU COMPRA!</div>
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
    // 1. Buscamos dinámicamente el producto que tenga el barcode 'MANUAL'
    const productoComodin = PRODUCTOS_DB.find(p => p.barcode === 'MANUAL');

    if (!productoComodin) {
        Swal.fire('Error', 'No se encontró el producto comodín "MANUAL" en la base de datos', 'error');
        return;
    }

    Swal.fire({
        title: 'Carga de Artículo Manual',
        html: `
            <input id="manualNombre" class="swal2-input" placeholder="Descripción (ej: Pan 1kg)" autofocus>
            <input id="manualPrecio" type="number" class="swal2-input" placeholder="Precio ($)">
        `,
        preConfirm: () => {
            const nombre = document.getElementById('manualNombre').value;
            const precio = parseFloat(document.getElementById('manualPrecio').value);
            if (!nombre || isNaN(precio) || precio <= 0) {
                Swal.showValidationMessage('Completá nombre y precio válido');
                return false;
            }
            return { name: nombre, price: precio };
        }
    }).then((result) => {
        if (result.isConfirmed) {
            // 2. Usamos el ID real que encontramos en el paso 1
            CARRITO.push({
                id: productoComodin.id, // <--- DINÁMICO: Funciona si tiene 3 o 10.000 productos
                name: `MANUAL: ${result.value.name.toUpperCase()}`,
                price: result.value.price,
                barcode: 'MANUAL',
                cantidad: 1
            });

            renderizarCarrito();
            if(window.sndSuccess) window.sndSuccess.play().catch(()=>{});
            setTimeout(() => document.getElementById('buscadorVenta').focus(), 100);
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

    // OPCIONAL: Devolver el foco al buscador de productos para seguir la venta
    document.getElementById('buscadorVenta').focus();
}

function cerrarSesion() {
    localStorage.clear();
    window.location.href = 'login.html';
}