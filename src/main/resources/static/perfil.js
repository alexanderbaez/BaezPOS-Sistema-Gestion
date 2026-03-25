// Ruta dinámica que no depende de un ID fijo en el código
const API_URL = "http://localhost:8080/api/v1/admin/my-company/profile";
const token = localStorage.getItem('baezpos_token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) {
        window.location.href = 'login.html';
        return;
    }
    cargarDatosEmpresa();
    vincularInputsPreview();
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
        const resp = await fetch(API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (resp.status === 401 || resp.status === 403) {
            window.location.href = 'index.html';
            return;
        }

        if (!resp.ok) throw new Error("Error de conexión");

        const emp = await resp.json();

        // Llenamos campos del formulario
        document.getElementById('empNombre').value = emp.name || '';
        document.getElementById('empCuit').value = emp.taxId || '';
        document.getElementById('empTel').value = emp.phone || '';
        document.getElementById('empEmail').value = emp.email || '';
        document.getElementById('empDireccion').value = emp.address || '';
        document.getElementById('empTicketMsg').value = emp.ticketMessage || '';

        // Lógica de Vencimiento
        if (emp.expirationDate) {
            // Se asume formato YYYY-MM-DD
            const fechaVenc = new Date(emp.expirationDate + "T12:00:00");
            const hoy = new Date();
            document.getElementById('vencimientoTexto').innerText = fechaVenc.toLocaleDateString('es-AR', {
                day: 'numeric', month: 'long', year: 'numeric'
            });

            const difDias = Math.ceil((fechaVenc - hoy) / (1000 * 60 * 60 * 24));
            const alerta = document.getElementById('alertaVencimiento');
            const mensajeDias = document.getElementById('mensajeDias');
            const badge = document.getElementById('badgeEstado');

            if (difDias <= 0) {
                badge.className = "badge rounded-pill p-2 px-4 bg-danger shadow-sm";
                badge.innerText = "SERVICIO VENCIDO";
                alerta.classList.remove('d-none');
                mensajeDias.innerText = "Tu servicio ha vencido. Contactá a Alexander para renovar el abono mensual.";
            } else if (difDias <= 7) {
                badge.className = "badge rounded-pill p-2 px-4 bg-warning text-dark shadow-sm";
                badge.innerText = "VENCE PRONTO";
                alerta.classList.remove('d-none');
                mensajeDias.innerText = `Te quedan ${difDias} días de servicio. Recordá renovar para evitar cortes.`;
            } else {
                badge.className = "badge rounded-pill p-2 px-4 bg-success shadow-sm";
                badge.innerText = "SERVICIO ACTIVO";
                alerta.classList.add('d-none');
            }
        }

        actualizarPreview();
    } catch (err) {
        console.error(err);
        Swal.fire('Error', 'No pudimos cargar los datos de tu empresa', 'error');
    }
}

async function actualizarEmpresa() {
    const data = {
        name: document.getElementById('empNombre').value,
        taxId: document.getElementById('empCuit').value,
        phone: document.getElementById('empTel').value,
        email: document.getElementById('empEmail').value,
        address: document.getElementById('empDireccion').value,
        ticketMessage: document.getElementById('empTicketMsg').value
    };

    try {
        const resp = await fetch(API_URL, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            Swal.fire('¡Guardado!', 'La información de tu negocio se actualizó.', 'success');
        } else {
            throw new Error("Error al guardar");
        }
    } catch (err) {
        Swal.fire('Error', 'Hubo un problema al guardar los datos.', 'error');
    }
}

function vincularInputsPreview() {
    ['empNombre', 'empDireccion', 'empTel', 'empTicketMsg'].forEach(id => {
        const input = document.getElementById(id);
        if(input) input.addEventListener('input', actualizarPreview);
    });
}

function actualizarPreview() {
    document.getElementById('previewNombre').innerText = document.getElementById('empNombre').value || 'TU NEGOCIO';
    document.getElementById('previewDir').innerText = document.getElementById('empDireccion').value || 'Tu Dirección';
    document.getElementById('previewTel').innerText = 'Tel: ' + (document.getElementById('empTel').value || '000-000');
    document.getElementById('previewMsg').innerText = document.getElementById('empTicketMsg').value || '¡Gracias por su compra!';
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