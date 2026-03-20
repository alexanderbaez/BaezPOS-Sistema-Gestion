const API_URL = "http://localhost:8080/api/companies/me";
const token = localStorage.getItem('baezpos_token');

document.addEventListener('DOMContentLoaded', () => {
    if (!token) window.location.href = 'index.html';
    cargarDatosEmpresa();
    vincularInputsPreview();
});

async function cargarDatosEmpresa() {
    try {
        const resp = await fetch(API_URL, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!resp.ok) throw new Error("Error de conexión");

        const emp = await resp.json();

        // Llenamos campos
        document.getElementById('empNombre').value = emp.name || '';
        document.getElementById('empCuit').value = emp.taxId || '';
        document.getElementById('empTel').value = emp.phone || '';
        document.getElementById('empEmail').value = emp.email || '';
        document.getElementById('empDireccion').value = emp.address || '';
        document.getElementById('empTicketMsg').value = emp.ticketMessage || '';

        // Lógica de Vencimiento
        if (emp.expirationDate) {
            const fechaVenc = new Date(emp.expirationDate + "T12:00:00");
            const hoy = new Date();
            document.getElementById('vencimientoTexto').innerText = fechaVenc.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' });

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
            }
        }

        actualizarPreview();
    } catch (err) {
        Swal.fire('Error', 'No pudimos conectar con el servidor', 'error');
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
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (resp.ok) {
            Swal.fire('¡Guardado!', 'La información de tu negocio se actualizó.', 'success');
        }
    } catch (err) {
        Swal.fire('Error', 'Hubo un problema al guardar los datos.', 'error');
    }
}

function vincularInputsPreview() {
    ['empNombre', 'empDireccion', 'empTel', 'empTicketMsg'].forEach(id => {
        document.getElementById(id).addEventListener('input', actualizarPreview);
    });
}

function actualizarPreview() {
    document.getElementById('previewNombre').innerText = document.getElementById('empNombre').value || 'TU NEGOCIO';
    document.getElementById('previewDir').innerText = document.getElementById('empDireccion').value || 'Tu Dirección';
    document.getElementById('previewTel').innerText = 'Tel: ' + (document.getElementById('empTel').value || '000-000');
    document.getElementById('previewMsg').innerText = document.getElementById('empTicketMsg').value || '¡Gracias por su compra!';
}