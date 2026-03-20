// 1. Definimos la base del servidor de Spring Boot
const URL_SERVIDOR = 'http://localhost:8080';

// 2. Armamos las rutas completas
const API_BASE = `${URL_SERVIDOR}/api/v1/products`;
const API_CAT = `${URL_SERVIDOR}/api/v1/categories`;

const token = localStorage.getItem('baezpos_token');

let PRODUCTOS_LOCAL = [];

document.addEventListener('DOMContentLoaded', () => {
    // Corrección: Verificación de token más estricta
    if (!token || token === 'undefined') { window.location.href = 'login.html'; return; }

    cargarDatosPerfil();
    listarProductos();
    cargarCategorias();

    const form = document.getElementById('formProducto');
    if(form) form.addEventListener('submit', guardarProducto);
});

// --- PERFIL Y SESIÓN ---
function cargarDatosPerfil() {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('userName').innerText = payload.sub || "Usuario";
        if(payload.companyName) document.getElementById('companyName').innerText = payload.companyName;
    } catch (e) {
        console.error("Error perfil:", e);
        // Si el token es corrupto, redirigir
        // window.location.href = 'login.html';
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

// --- CATEGORÍAS ---
async function cargarCategorias() {
    try {
        const res = await fetch(API_CAT, { headers: { 'Authorization': `Bearer ${token}` } });
        if(!res.ok) throw new Error("Error al cargar categorías");
        const categorias = await res.json();

        const selectModal = document.getElementById('prodCategoria');
        const selectFiltro = document.getElementById('filtroCategoria');

        let options = '<option value="">Seleccionar...</option>';
        let optionsFiltro = '<option value="">Todas las categorías</option>';

        categorias.forEach(c => {
            const opt = `<option value="${c.id}">${c.name}</option>`;
            options += opt;
            optionsFiltro += opt;
        });

        if(selectModal) selectModal.innerHTML = options;
        if(selectFiltro) selectFiltro.innerHTML = optionsFiltro;
    } catch (err) { console.error(err); }
}

function abrirModalCategoria() {
    new bootstrap.Modal(document.getElementById('modalCategoria')).show();
}

async function guardarCategoria() {
    const nombre = document.getElementById('newCatNombre').value;
    if(!nombre) return Swal.fire('Atención', "Escribe un nombre", 'warning');

    try {
        const res = await fetch(API_CAT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name: nombre })
        });
        if(res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalCategoria')).hide();
            document.getElementById('newCatNombre').value = '';
            await cargarCategorias(); // Esperar a que recargue
            Swal.fire('¡Éxito!', 'Categoría lista', 'success');
        }
    } catch (err) { console.error(err); }
}

// --- PRODUCTOS ---
async function listarProductos() {
    try {
        const res = await fetch(API_BASE, { headers: { 'Authorization': `Bearer ${token}` } });
        if(res.status === 401) { window.location.href = 'login.html'; return; }
        PRODUCTOS_LOCAL = await res.json();
        renderizarTabla(PRODUCTOS_LOCAL);
    } catch (err) { console.error(err); }
}

function renderizarTabla(lista) {
    const tabla = document.getElementById('listaProductos');
    if(!tabla) return;
    tabla.innerHTML = '';

    if (lista.length === 0) {
        tabla.innerHTML = '<tr><td colspan="5" class="text-center p-4">No se encontraron productos.</td></tr>';
        return;
    }
    lista.forEach(p => {
        // Corrección: Manejo de nulos en categoryName para evitar errores de render
        const catName = p.categoryName || 'Sin Categoría';
        tabla.innerHTML += `
            <tr>
                <td class="ps-4"><b>${p.name}</b><br><small class="text-muted">${p.barcode || 'S/C'}</small></td>
                <td><span class="badge bg-light text-dark border">${catName}</span></td>
                <td class="text-primary fw-bold">$${p.price.toFixed(2)}</td>
                <td><span class="badge ${p.stock <= p.minStock ? 'bg-danger' : 'bg-success'}">${p.stock} unid.</span></td>
                <td class="text-end pe-4">
                    <button class="btn btn-sm btn-outline-secondary me-1" title="Imprimir Etiqueta" onclick="imprimirEtiqueta(${p.id})"><i class="bi bi-printer"></i></button>
                    <button class="btn btn-sm btn-outline-primary me-1" title="Editar" onclick="editarProducto(${p.id})"><i class="bi bi-pencil"></i></button>
                    <button class="btn btn-sm btn-outline-danger" title="Eliminar" onclick="eliminarProducto(${p.id})"><i class="bi bi-trash"></i></button>
                </td>
            </tr>`;
    });
}

function filtrarProductos() {
    const texto = document.getElementById('buscador').value.toLowerCase();
    const catId = document.getElementById('filtroCategoria').value;

    const filtrados = PRODUCTOS_LOCAL.filter(p => {
        const coincideTexto = p.name.toLowerCase().includes(texto) || (p.barcode && p.barcode.toLowerCase().includes(texto));
        const coincideCat = catId === "" || p.categoryId == catId;
        return coincideTexto && coincideCat;
    });
    renderizarTabla(filtrados);
}

async function guardarProducto(e) {
    e.preventDefault();
    const id = document.getElementById('prodId').value;

    const body = {
        name: document.getElementById('prodNombre').value,
        description: "",
        barcode: document.getElementById('prodBarcode').value,
        cost: parseFloat(document.getElementById('prodCosto').value) || 0,
        price: parseFloat(document.getElementById('prodPrecio').value) || 0,
        stock: parseInt(document.getElementById('prodStock').value) || 0,
        minStock: parseInt(document.getElementById('prodMinStock').value) || 0,
        categoryId: parseInt(document.getElementById('prodCategoria').value)
    };

    try {
        const res = await fetch(id ? `${API_BASE}/${id}` : API_BASE, {
            method: id ? 'PUT' : 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            const modalEl = document.getElementById('modalProducto');
            bootstrap.Modal.getInstance(modalEl).hide();
            await listarProductos();
            Swal.fire({ icon: 'success', title: id ? 'Actualizado' : 'Creado', toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
        } else {
            const errorData = await res.json();
            Swal.fire('Error', errorData.message || 'Error al guardar el producto', 'error');
        }
    } catch (err) { console.error(err); }
}

function prepararFormulario() {
    document.getElementById('formProducto').reset();
    document.getElementById('prodId').value = '';
    document.getElementById('modalTitulo').innerText = "Nuevo Producto";
    new bootstrap.Modal(document.getElementById('modalProducto')).show();
}

async function editarProducto(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const p = await res.json();

        document.getElementById('prodId').value = p.id;
        document.getElementById('prodNombre').value = p.name || '';
        document.getElementById('prodBarcode').value = p.barcode || '';
        document.getElementById('prodCosto').value = p.cost || 0;
        document.getElementById('prodPrecio').value = p.price || 0;
        document.getElementById('prodStock').value = p.stock || 0;
        document.getElementById('prodMinStock').value = p.minStock || 0;

        if (p.categoryId) {
            document.getElementById('prodCategoria').value = p.categoryId;
        }

        document.getElementById('modalTitulo').innerText = "Editar Producto";
        new bootstrap.Modal(document.getElementById('modalProducto')).show();
    } catch (err) { console.error("Error al editar:", err); }
}

async function eliminarProducto(id) {
    const result = await Swal.fire({
        title: '¿A la papelera?',
        text: "Podrás recuperarlo luego",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Sí, borrar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        try {
            const res = await fetch(`${API_BASE}/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                await listarProductos();
                Swal.fire('Eliminado', 'Producto enviado a la papelera', 'success');
            }
        } catch (err) { console.error(err); }
    }
}

async function abrirPapelera() {
    try {
        const res = await fetch(`${API_BASE}/deleted`, { headers: { 'Authorization': `Bearer ${token}` } });
        const borrados = await res.json();
        const tabla = document.getElementById('listaBorrados');
        tabla.innerHTML = '';

        if(borrados.length === 0) {
            tabla.innerHTML = '<tr><td colspan="2" class="text-center p-3 text-muted">Papelera vacía</td></tr>';
        } else {
            borrados.forEach(p => {
                tabla.innerHTML += `
                    <tr>
                        <td class="ps-3"><b>${p.name}</b><br><small>${p.barcode || 'S/C'}</small></td>
                        <td class="text-end pe-3">
                            <button class="btn btn-sm btn-success" onclick="restaurarProducto(${p.id})">Restaurar</button>
                        </td>
                    </tr>`;
            });
        }
        new bootstrap.Modal(document.getElementById('modalPapelera')).show();
    } catch (err) { console.error(err); }
}

async function restaurarProducto(id) {
    try {
        const res = await fetch(`${API_BASE}/${id}/activate`, {
            method: 'PATCH',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(res.ok) {
            bootstrap.Modal.getInstance(document.getElementById('modalPapelera')).hide();
            await listarProductos();
            Swal.fire('Restaurado', 'El producto vuelve a estar activo', 'success');
        }
    } catch (err) { console.error(err); }
}

// --- LÓGICA DE ESCANEO ---
document.addEventListener('keydown', (e) => {
    const buscador = document.getElementById('buscador');
    const modalProducto = document.getElementById('modalProducto');
    const inputCodigo = document.getElementById('prodBarcode');

    if (modalProducto && modalProducto.classList.contains('show')) {
        if (e.key === 'Enter' && document.activeElement === inputCodigo) {
            e.preventDefault();
            document.getElementById('prodNombre').focus();
        }
    } else {
        if (/[0-9]/.test(e.key) && document.activeElement !== buscador) {
            if(buscador) buscador.focus();
        }
        if (e.key === 'Enter' && document.activeElement === buscador) {
            filtrarProductos();
        }
    }
});

// --- FUNCIÓN IMPRIMIR (Corrección de inyección de script) ---
function imprimirEtiqueta(id) {
    const p = PRODUCTOS_LOCAL.find(prod => prod.id === id);
    if (!p || !p.barcode) {
        return Swal.fire('Error', 'El producto no tiene código de barras', 'warning');
    }

    const ventana = window.open('', 'PRINT', 'height=400,width=600');
    ventana.document.write(`
        <html>
            <head>
                <title>Etiqueta - ${p.name}</title>
                <style>
                    body { margin: 0; display: flex; justify-content: center; align-items: center; height: 100vh; }
                    .etiqueta {
                        width: 50mm; height: 25mm; border: 1px solid #eee;
                        display: flex; flex-direction: column; align-items: center; justify-content: center;
                        padding: 5px; box-sizing: border-box; text-align: center;
                    }
                    .nombre { font-size: 10px; font-family: sans-serif; font-weight: bold; margin-bottom: 2px; }
                    .barcode { width: 100%; max-height: 40px; }
                    .precio { font-size: 14px; font-family: sans-serif; font-weight: bold; margin-top: 2px; }
                </style>
            </head>
            <body>
                <div class="etiqueta">
                    <div class="nombre">${p.name.toUpperCase()}</div>
                    <svg id="barcode-svg" class="barcode"></svg>
                    <div class="precio">$${p.price.toFixed(2)}</div>
                </div>
                <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
                <script>
                    window.onload = function() {
                        JsBarcode("#barcode-svg", "${p.barcode}", {
                            format: "CODE128", width: 1.5, height: 40, displayValue: true, fontSize: 10
                        });
                        setTimeout(() => { window.print(); window.close(); }, 500);
                    };
                </script>
            </body>
        </html>
    `);
    ventana.document.close();
}