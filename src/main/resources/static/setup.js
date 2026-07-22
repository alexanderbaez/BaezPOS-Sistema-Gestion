document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('http://localhost:8080/api/v1/auth/setup-status');
        if (res.ok) {
            const data = await res.json();
            if (!data.isSetupRequired) {
                // Si el sistema ya fue configurado, llevar a la fuerza a login
                window.location.href = 'login.html';
            }
        }
    } catch (e) {
        console.error("Error conectando con el servidor local para verificar setup:", e);
    }
});

document.getElementById('setupForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const btn = document.getElementById('btnProcesar');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const messageContainer = document.getElementById('messageContainer');

    // CORRECCIÓN: Estructura del Payload mapeada exactamente con los nuevos campos para el endpoint de inicialización
    const payload = {
        userName: document.getElementById('userName').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        companyName: document.getElementById('companyName').value,
        taxId: document.getElementById('taxId').value,
        phone: document.getElementById('phone').value,
        address: document.getElementById('address').value,
        ticketMessage: document.getElementById('ticketMessage').value,

        // Atributos obligatorios para la facturación electrónica
        iibb: document.getElementById('iibb').value,
        inicioActividades: document.getElementById('inicioActividades').value,
        condicionIva: document.getElementById('condicionIva').value
    };

    messageContainer.innerHTML = '';
    btnText.classList.add('d-none');
    loader.classList.remove('d-none');
    btn.classList.add('disabled');

    try {
        const response = await fetch('http://localhost:8080/api/v1/auth/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const data = await response.json();

            // Loguear automáticamente
            const cleanRole = (data.role || "").replace('ROLE_', '');

            localStorage.clear();
            localStorage.setItem('baezpos_token', data.token);
            localStorage.setItem('baezpos_user_role', cleanRole);
            localStorage.setItem('baezpos_user_name', data.name || "Administrador");

            Swal.fire({
                title: '¡Sistema Configurado!',
                text: 'Bienvenido a BaezPOS. Redirigiendo a tu Dashboard...',
                icon: 'success',
                showConfirmButton: false,
                timer: 2000
            }).then(() => {
                window.location.href = 'dashboard.html';
            });

        } else {
            const errorData = await response.json().catch(() => ({}));
            let errorMsg = errorData.message || "Error al configurar el sistema. Intente de nuevo.";

            // Si es un Validation Error devuelto por nuestro backend
            if (errorData.validationErrors) {
                errorMsg = Object.values(errorData.validationErrors).join('<br>');
            }

            messageContainer.innerHTML = `<div class="alert alert-danger">${errorMsg}</div>`;
            resetButton();
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        messageContainer.innerHTML = `<div class="alert alert-warning">No se pudo conectar con el servidor local para inicializar.</div>`;
        resetButton();
    }

    function resetButton() {
        btnText.classList.remove('d-none');
        loader.classList.add('d-none');
        btn.classList.remove('disabled');
    }
});