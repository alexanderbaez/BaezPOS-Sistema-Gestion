document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnIngresar');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const messageContainer = document.getElementById('messageContainer');

    // Limpiar UI
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

            // 1. Extraemos y limpiamos el rol
            const rawRole = data.role || "";
            const cleanRole = rawRole.replace('ROLE_', '');

            // 2. Guardamos en localStorage (Limpiamos antes para evitar basura de otras sesiones)
            localStorage.clear();
            localStorage.setItem('baezpos_token', data.token);
            localStorage.setItem('baezpos_user_role', cleanRole);
            localStorage.setItem('baezpos_user_name', data.name || "Usuario");
            // Guardamos el companyId para el chequeo de licencia posterior
            localStorage.setItem('baezpos_company_id', data.companyId);

            messageContainer.innerHTML = `<div class="alert alert-success">¡Bienvenido! Redirigiendo...</div>`;

            // 3. Redirección según el rol
            setTimeout(() => {
                if (cleanRole === 'SUPER_ADMIN') {
                    window.location.href = 'admin-maestro.html';
                } else if (cleanRole === 'ADMIN') {
                    window.location.href = 'dashboard.html';
                } else {
                    window.location.href = 'ventas.html';
                }
            }, 800);

        } else {
            // --- BLOQUE DE DETECCIÓN DE ERRORES DEL SERVIDOR ---
            const errorData = await response.json().catch(() => ({}));
            // Buscamos el mensaje en 'message' o 'error'
            const errorMessage = (errorData.message || errorData.error || "").toUpperCase();

            // --- EL CANDADO DE ALEXANDER ---
            // Si el mensaje dice SUSPENDIDA o VENCIDA, o si el servidor tiró un 403 (Forbidden)
            if (errorMessage.includes("CUENTA_SUSPENDIDA") ||
                errorMessage.includes("SUSCRIPCION_VENCIDA") ||
                response.status === 403) {

                Swal.fire({
                    title: '¡SISTEMA SUSPENDIDO!',
                    text: 'Tu suscripción ha vencido o tu cuenta está inactiva. Contacta a Alexander Báez para habilitar el servicio.',
                    icon: 'error',
                    showCancelButton: true,
                    confirmButtonColor: '#25D366',
                    confirmButtonText: '<i class="bi bi-whatsapp"></i> Hablar con Alexander',
                    cancelButtonText: 'Cerrar',
                    allowOutsideClick: false,
                    allowEscapeKey: false
                }).then((result) => {
                    if (result.isConfirmed) {
                        window.open('https://wa.me/5492645468570?text=Hola Alexander, mi sistema aparece como suspendido. Necesito habilitarlo.');
                    }
                });
            } else {
                // Error común de login
                messageContainer.innerHTML = `<div class="alert alert-danger">Usuario o contraseña incorrectos</div>`;
            }
            resetButton();
        }
    } catch (error) {
        console.error("Error de conexión:", error);
        messageContainer.innerHTML = `<div class="alert alert-warning">No se pudo conectar con el servidor. Revisá tu conexión.</div>`;
        resetButton();
    }
});

function resetButton() {
    document.getElementById('btnText').classList.remove('d-none');
    document.getElementById('loader').classList.add('d-none');
    document.getElementById('btnIngresar').classList.remove('disabled');
}