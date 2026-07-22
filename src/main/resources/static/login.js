// Variable global para el modal
let modalRecuperacionInstance;

// 1. Verificación de Setup Inicial al cargar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const res = await fetch('http://localhost:8080/api/v1/auth/setup-status');
        if (res.ok) {
            const data = await res.json();
            if (data.isSetupRequired === true) {
                window.location.href = 'setup.html';
            }
        }
    } catch (e) {
        console.error("Error de conexión inicial:", e);
    }
});

// 2. Manejo de Login (MODIFICADO Y CORREGIDO)
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnIngresar');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const messageContainer = document.getElementById('messageContainer');

    messageContainer.innerHTML = '';
    btnText.classList.add('d-none');
    loader.classList.remove('d-none');
    btn.classList.add('disabled');

    try {
        const response = await fetch('http://localhost:8080/api/v1/auth/authenticate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: password })
        });

        if (response.ok) {
            const data = await response.json();
            const cleanRole = (data.role || "").replace('ROLE_', '');

            localStorage.clear();
            localStorage.setItem('baezpos_token', data.token);
            localStorage.setItem('baezpos_user_role', cleanRole);
            localStorage.setItem('baezpos_user_name', data.name || "Usuario");

            messageContainer.innerHTML = `<div class="alert alert-success custom-alert">Iniciando sesión...</div>`;

            setTimeout(() => {
                if (cleanRole === 'ADMIN') window.location.href = 'dashboard.html';
                else if (cleanRole === 'VENDEDOR') window.location.href = 'ventas.html';
                else {
                    Swal.fire('Error', 'Rol no reconocido.', 'error');
                    resetButton();
                }
            }, 800);
        } else {
            // CORRECCIÓN SENIOR: Leemos el JSON de error devuelto por Spring Boot
            let mensajeError = "Credenciales incorrectas";
            try {
                const errorData = await response.json();
                if (errorData && errorData.message) {
                    mensajeError = errorData.message; // Captura "La clave temporal ha expirado..."
                }
            } catch (jsonErr) {
                console.warn("La respuesta no contiene un JSON de error válido:", jsonErr);
            }

            messageContainer.innerHTML = `<div class="alert alert-danger custom-alert">${mensajeError}</div>`;
            resetButton();
        }
    } catch (error) {
        console.error("Error en la petición de autenticación:", error);
        messageContainer.innerHTML = `<div class="alert alert-warning custom-alert">Servidor local desconectado</div>`;
        resetButton();
    }
});

function resetButton() {
    document.getElementById('btnText').classList.remove('d-none');
    document.getElementById('loader').classList.add('d-none');
    document.getElementById('btnIngresar').classList.remove('disabled');
}

// --- SECCIÓN DE RECUPERACIÓN OFFLINE ---

async function abrirModalRecuperacion() {
    if (!modalRecuperacionInstance) {
        modalRecuperacionInstance = new bootstrap.Modal(document.getElementById('modalRecuperacion'));
    }

    // Limpiar input y cargar ID
    document.getElementById('llaveMaestraInput').value = '';
    document.getElementById('pcIdDisplay').innerText = "OBTENIENDO ID...";
    modalRecuperacionInstance.show();

    try {
        const res = await fetch('http://localhost:8080/api/v1/auth/pc-id');
        const data = await res.json();
        document.getElementById('pcIdDisplay').innerText = data.pcId;
    } catch (e) {
        document.getElementById('pcIdDisplay').innerText = "ERROR AL OBTENER HARDWARE ID";
    }
}

function copiarId() {
    const id = document.getElementById('pcIdDisplay').innerText;
    navigator.clipboard.writeText(id);
    const Toast = Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 });
    Toast.fire({ icon: 'success', title: 'ID copiado al portapapeles' });
}

async function validarLlaveOffline() {
    const llave = document.getElementById('llaveMaestraInput').value.trim();

    if (llave.length < 5) {
        Swal.fire('Atención', 'Ingrese la llave de 6 dígitos proporcionada.', 'warning');
        return;
    }

    try {
        const res = await fetch('http://localhost:8080/api/v1/auth/validar-llave-maestra', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ llave: llave })
        });

        if (res.ok) {
            Swal.fire({
                title: 'Acceso Restablecido',
                text: 'La llave es correcta. Su nueva clave es: admin123',
                icon: 'success',
                confirmButtonColor: '#1e3a8a'
            }).then(() => {
                modalRecuperacionInstance.hide();
                document.getElementById('password').value = 'admin123';
            });
        } else {
            Swal.fire('Error', 'Llave incorrecta para este equipo.', 'error');
        }
    } catch (e) {
        Swal.fire('Error', 'No hay conexión con el servicio local.', 'error');
    }
}