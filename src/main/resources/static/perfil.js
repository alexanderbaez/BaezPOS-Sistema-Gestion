// Ruta centralizada para el perfil de la empresa
const API_URL = "/admin/my-company/profile";

document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar datos de la empresa desde la BD
    cargarDatosEmpresa();

    // 2. Vincular escritura en vivo para la vista previa
    vincularInputsPreview();

    // 3. Vincular evento del switch para activar/desactivar datos fiscales
    vincularSwitchFiscal();
});

async function cargarDatosEmpresa() {
    try {
        const resp = await apiFetch(API_URL);

        if (!resp.ok) throw new Error("No se pudo obtener la información.");

        const emp = await resp.json();

        // Guardar en caché local usando AMBAS claves para sincronizar con Ventas/Cobros
        localStorage.setItem('config_comercio', JSON.stringify(emp));
        localStorage.setItem('DATOS_EMPRESA', JSON.stringify(emp));

        // Llenado de formulario principal
        document.getElementById('empNombre').value = emp.name || '';
        document.getElementById('empCuit').value = emp.taxId || '';
        document.getElementById('empTel').value = emp.phone || '';
        document.getElementById('empEmail').value = emp.email || '';
        document.getElementById('empDireccion').value = emp.address || '';
        document.getElementById('empTicketMsg').value = emp.ticketMessage || '';

        // Carga de campos fiscales para ARCA
        document.getElementById('empIibb').value = emp.iibb || '';
        document.getElementById('empInicioAct').value = emp.inicioActividades || '';
        document.getElementById('empIva').value = emp.condicionIva || 'Responsable Monotributo';

        // Cargar estado del Switch (Respeta el booleano real guardado en la BD)
        const checkFiscal = document.getElementById('checkMostrarFiscal');
        checkFiscal.checked = emp.hasTaxData !== undefined ? Boolean(emp.hasTaxData) : true;

        // Actualizar el nombre en el sidebar con el dato real de la DB
        const elCompanyNav = document.getElementById('companyNameNav');
        if (elCompanyNav) elCompanyNav.innerText = (emp.name || 'MI NEGOCIO').toUpperCase();

        // Gestión de suscripción y vencimiento
        procesarVencimiento(emp.expirationDate);

        // Sincronizar estado del switch y vista previa inicial
        aplicarEstadoFiscal(checkFiscal.checked);
        actualizarPreview();

    } catch (err) {
        console.error(err);
        Swal.fire({
            title: 'Error de Carga',
            text: 'No logramos conectar con el servidor para traer tus datos.',
            icon: 'error',
            confirmButtonColor: '#2563eb'
        });
    }
}

function procesarVencimiento(fechaStr) {
    if (!fechaStr) return;

    const fechaVenc = new Date(fechaStr + "T12:00:00");
    const hoy = new Date();
    const difTiempo = fechaVenc - hoy;
    const difDias = Math.ceil(difTiempo / (1000 * 60 * 60 * 24));

    const vencInput = document.getElementById('vencimientoTexto');
    const alerta = document.getElementById('alertaVencimiento');
    const mensajeDias = document.getElementById('mensajeDias');
    const badge = document.getElementById('badgeEstado');

    vencInput.innerText = fechaVenc.toLocaleDateString('es-AR', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    badge.className = "badge rounded-pill p-2 px-4 shadow-sm ";

    if (difDias <= 0) {
        badge.classList.add("bg-danger");
        badge.innerText = "SERVICIO VENCIDO";
        alerta.classList.remove('d-none');
        mensajeDias.innerHTML = `<strong>Tu servicio ha vencido.</strong> Contactá al soporte para renovar tu acceso hoy mismo.`;
    } else if (difDias <= 7) {
        badge.classList.add("bg-warning", "text-dark");
        badge.innerText = "VENCE PRONTO";
        alerta.classList.remove('d-none');
        alerta.classList.replace('alert-danger', 'alert-warning');
        mensajeDias.innerText = `Tu abono mensual vence en ${difDias} días. ¡No te quedes sin sistema!`;
    } else {
        badge.classList.add("bg-success");
        badge.innerText = "SERVICIO ACTIVO";
        alerta.classList.add('d-none');
    }
}

async function actualizarEmpresa(silencioso = false) {
    const nombre = document.getElementById('empNombre').value;
    if (!nombre) {
        Swal.fire('Atención', 'El nombre del negocio es obligatorio.', 'warning');
        return;
    }

    // Payload completo conteniendo estado del switch y campos ARCA
    const data = {
        name: nombre,
        taxId: document.getElementById('empCuit').value,
        phone: document.getElementById('empTel').value,
        email: document.getElementById('empEmail').value,
        address: document.getElementById('empDireccion').value,
        ticketMessage: document.getElementById('empTicketMsg').value,
        hasTaxData: document.getElementById('checkMostrarFiscal').checked,
        iibb: document.getElementById('empIibb').value,
        inicioActividades: document.getElementById('empInicioAct').value,
        condicionIva: document.getElementById('empIva').value
    };

    try {
        if (!silencioso) {
            Swal.fire({
                title: 'Guardando configuración...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });
        }

        const resp = await apiFetch(API_URL, {
            method: 'PUT',
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            // Sincronizamos AMBAS claves en LocalStorage
            localStorage.setItem('config_comercio', JSON.stringify(data));
            localStorage.setItem('DATOS_EMPRESA', JSON.stringify(data));

            // Actualización reactiva del Sidebar
            const elCompanyNav = document.getElementById('companyNameNav');
            if (elCompanyNav) elCompanyNav.innerText = nombre.toUpperCase();

            if (!silencioso) {
                Swal.fire({
                    title: '¡Actualizado!',
                    text: 'La identidad de tu negocio ha sido guardada.',
                    icon: 'success',
                    timer: 2000,
                    showConfirmButton: false
                });
            } else {
                // Notificación tipo Toast para cambios rápidos con el switch
                const Toast = Swal.mixin({
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000,
                    timerProgressBar: true
                });
                Toast.fire({
                    icon: 'success',
                    title: data.hasTaxData ? 'Datos fiscales activados' : 'Modo Ticket no fiscal activado'
                });
            }
        } else {
            throw new Error();
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudieron guardar los cambios. Intenta nuevamente.', 'error');
    }
}

function vincularSwitchFiscal() {
    const switchFiscal = document.getElementById('checkMostrarFiscal');
    if (!switchFiscal) return;

    switchFiscal.addEventListener('change', (e) => {
        const estaActivo = e.target.checked;
        aplicarEstadoFiscal(estaActivo);

        // Guarda de inmediato el cambio en el servidor y sincroniza
        actualizarEmpresa(true);
    });
}

function aplicarEstadoFiscal(activo) {
    // 1. Mostrar/Ocultar y alternar comportamiento en la vista previa del Ticket
    const previewBloque = document.getElementById('previewBloqueFiscal');
    const previewPie = document.getElementById('previewPieFiscal');
    const previewTipo = document.getElementById('previewTipoComprobante');

    if (previewBloque) previewBloque.style.display = activo ? 'block' : 'none';
    if (previewPie) previewPie.style.display = activo ? 'block' : 'none';
    if (previewTipo) {
        previewTipo.innerText = activo ? 'FACTURA C N° 00001-00001234' : 'TICKET NO FISCAL';
    }

    // 2. Deshabilitar/Habilitar inputs de datos fiscales
    const inputsFiscales = ['empIibb', 'empInicioAct', 'empIva'];
    inputsFiscales.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !activo;
    });
}

function vincularInputsPreview() {
    const mapeo = {
        'empNombre': 'previewNombre',
        'empDireccion': 'previewDir',
        'empTel': 'previewTel',
        'empEmail': 'previewEmail',
        'empTicketMsg': 'previewMsg',
        'empCuit': 'previewCuit',
        'empIibb': 'previewIibb',
        'empInicioAct': 'previewInicio',
        'empIva': 'previewIva'
    };

    Object.keys(mapeo).forEach(idInput => {
        const inputEl = document.getElementById(idInput);
        if (!inputEl) return;

        inputEl.addEventListener('input', (e) => {
            const val = e.target.value;
            const targetId = mapeo[idInput];
            const targetEl = document.getElementById(targetId);

            if (!targetEl) return;

            if (idInput === 'empTel') {
                targetEl.innerText = val ? `Tel: ${val}` : 'Tel: 000-000';
            } else if (idInput === 'empEmail') {
                targetEl.innerText = val ? `Email: ${val}` : '';
            } else if (idInput === 'empNombre') {
                targetEl.innerText = val.toUpperCase() || 'TU NEGOCIO';
            } else if (idInput === 'empInicioAct') {
                if (val) {
                    const parts = val.split('-');
                    targetEl.innerText = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } else {
                    targetEl.innerText = '-';
                }
            } else {
                targetEl.innerText = val || '-';
            }
        });
    });

    // Listener para el select de Condición IVA
    const selectIva = document.getElementById('empIva');
    if (selectIva) {
        selectIva.addEventListener('change', (e) => {
            const previewIva = document.getElementById('previewIva');
            if (previewIva) previewIva.innerText = e.target.value;
        });
    }
}

async function cambiarPassword() {
    const pass = document.getElementById('nuevaPass').value;
    const confirm = document.getElementById('confirmarPass').value;

    if (!pass || pass.length < 6) {
        Swal.fire('Atención', 'La contraseña debe tener al menos 6 caracteres.', 'warning');
        return;
    }

    if (pass !== confirm) {
        Swal.fire('Error', 'Las contraseñas no coinciden.', 'error');
        return;
    }

    try {
        Swal.fire({
            title: 'Actualizando seguridad...',
            didOpen: () => Swal.showLoading()
        });

        const resp = await apiFetch("/users/update-password", {
            method: 'PATCH',
            body: JSON.stringify({ newPassword: pass })
        });

        if (resp.ok) {
            Swal.fire('¡Éxito!', 'Contraseña actualizada correctamente.', 'success');
            document.getElementById('nuevaPass').value = '';
            document.getElementById('confirmarPass').value = '';
        } else {
            throw new Error();
        }
    } catch (err) {
        Swal.fire('Error', 'No se pudo cambiar la contraseña. Revisa el servidor.', 'error');
    }
}

function actualizarPreview() {
    document.getElementById('previewNombre').innerText = (document.getElementById('empNombre').value || 'TU NEGOCIO').toUpperCase();
    document.getElementById('previewDir').innerText = document.getElementById('empDireccion').value || 'Tu Dirección';
    document.getElementById('previewTel').innerText = 'Tel: ' + (document.getElementById('empTel').value || '000-000');

    // Asignación dinámica del email en la vista previa
    const emailVal = document.getElementById('empEmail').value;
    document.getElementById('previewEmail').innerText = emailVal ? `Email: ${emailVal}` : '';

    document.getElementById('previewCuit').innerText = document.getElementById('empCuit').value || '-';
    document.getElementById('previewIibb').innerText = document.getElementById('empIibb').value || '-';
    document.getElementById('previewMsg').innerText = document.getElementById('empTicketMsg').value || '¡Gracias por su compra!';
    document.getElementById('previewIva').innerText = document.getElementById('empIva').value || 'Responsable Monotributo';

    const initAct = document.getElementById('empInicioAct').value;
    if (initAct) {
        const parts = initAct.split('-');
        document.getElementById('previewInicio').innerText = `${parts[2]}/${parts[1]}/${parts[0]}`;
    } else {
        document.getElementById('previewInicio').innerText = '-';
    }
}