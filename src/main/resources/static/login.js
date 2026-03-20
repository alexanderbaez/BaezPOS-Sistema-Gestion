document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    // Referencias a elementos UI
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const btn = document.getElementById('btnIngresar');
    const btnText = document.getElementById('btnText');
    const loader = document.getElementById('loader');
    const messageContainer = document.getElementById('messageContainer');

    // Limpiar alertas previas
    messageContainer.innerHTML = '';

    // Estado: Cargando
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

            // 1. Persistencia de Sesión
            localStorage.setItem('baezpos_token', data.token);
            localStorage.setItem('baezpos_user_name', data.userName || "Alexander");
            localStorage.setItem('baezpos_user_role', data.role || "ADMIN");

            // 2. Feedback de Éxito
            messageContainer.innerHTML = `
                <div class="alert alert-success custom-alert d-flex align-items-center mb-4 shadow-sm" role="alert">
                    <i class="bi bi-check-circle-fill me-2 fs-5"></i>
                    <div>¡Bienvenido, ${data.userName || "Alexander"}! Accediendo...</div>
                </div>
            `;

            // 3. Redirección suave
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 1000);

        } else {
            // Error de Credenciales
            messageContainer.innerHTML = `
                <div class="alert alert-danger custom-alert d-flex align-items-center mb-4 shadow-sm" role="alert">
                    <i class="bi bi-exclamation-octagon-fill me-2 fs-5"></i>
                    <div>Acceso denegado. Verifica tus datos.</div>
                </div>
            `;
            resetButton();
        }
    } catch (error) {
        // Error de Conexión (Backend apagado)
        console.error("Error de red:", error);
        messageContainer.innerHTML = `
            <div class="alert alert-warning custom-alert d-flex align-items-center mb-4 shadow-sm" role="alert">
                <i class="bi bi-wifi-off me-2 fs-5"></i>
                <div>No se pudo conectar con el servidor central.</div>
            </div>
        `;
        resetButton();
    }
});

function resetButton() {
    document.getElementById('btnText').classList.remove('d-none');
    document.getElementById('loader').classList.add('d-none');
    document.getElementById('btnIngresar').classList.remove('disabled');
}