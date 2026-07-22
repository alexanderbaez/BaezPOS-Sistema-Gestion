/**
 * BaezPOS - Centinela de Autenticación Global (Security & Auth)
 * Este archivo centraliza la validación de tokens y las peticiones al backend.
 */

const BASE_URL = 'http://localhost:8080/api/v1';
const token = localStorage.getItem('baezpos_token');
let payloadIdentidad = null;

function verificarAccesoSeguro() {
    if (!token) {
        window.location.href = 'login.html';
        return;
    }

    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        payloadIdentidad = JSON.parse(jsonPayload);

        // Validar expiración del JWT
        const expDate = payloadIdentidad.exp * 1000;
        if (Date.now() >= expDate) {
            console.warn("Seguridad: Token JWT expirado.");
            forzarCierreSesionDialog("Tu sesión ha expirado por inactividad. Por favor, vuelve a ingresar.");
        }
    } catch (e) {
        console.error("Seguridad: Token adulterado o formato inválido.", e);
        window.location.href = 'login.html';
    }
}

// 1. Ejecutamos la barrera de seguridad de inmediato
verificarAccesoSeguro();

/**
 * 2. Nuevo método estándar para llamar al Backend.
 * Reemplaza al 'fetch()' crudo, inyectando JWT y atrapando caídas de sesión (401/403).
 */
async function apiFetch(path, options = {}) {
    const headers = options.headers ? new Headers(options.headers) : new Headers();
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
        headers.set('Content-Type', 'application/json');
    }

    headers.set('Authorization', `Bearer ${token}`);

    const config = { ...options, headers };
    const url = path.startsWith('http') ? path : `${BASE_URL}${path.startsWith('/') ? path : '/' + path}`;

    try {
        const response = await fetch(url, config);

        // Si es 401, el token no sirve -> Al Login
        if (response.status === 401) {
            forzarCierreSesionDialog("Tu sesión ha expirado. Por favor, vuelve a ingresar.");
            throw new Error("Unauthorized");
        }

        // Si es 403, el usuario no tiene permiso para ESA petición,
        // pero NO lo echamos del sistema. Solo lanzamos el error para que el JS lo maneje.
        if (response.status === 403) {
            console.warn("Acceso denegado a este recurso:", url);
            throw new Error("Forbidden");
        }

        return response;
    } catch (err) {
        if (err.message === 'Unauthorized') throw err;
        console.error(`Error en apiFetch hacia ${url}:`, err);
        throw err;
    }
}

/**
 * 3. Acción Global de Salir Protegida (SweetAlert2)
 */
function cerrarSesion() {
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: '¿Cerrar sesión?',
            text: "Se finalizará el acceso al sistema de ventas.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#6c757d',
            confirmButtonText: 'Sí, salir',
            cancelButtonText: 'Cancelar'
        }).then((result) => { 
            if (result.isConfirmed) { 
                localStorage.clear(); 
                window.location.href = 'login.html'; 
            } 
        });
    } else {
        localStorage.clear();
        window.location.href = 'login.html';
    }
}

function forzarCierreSesionDialog(motivo) {
    localStorage.clear();
    if (typeof Swal !== 'undefined') {
        Swal.fire({
            title: 'Sesión Caducada',
            text: motivo,
            icon: 'warning',
            confirmButtonColor: '#2563eb',
            confirmButtonText: 'Ir a Iniciar Sesión',
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(() => {
            window.location.href = 'login.html';
        });
    } else {
        alert(motivo);
        window.location.href = 'login.html';
    }
}

/**
 * 4. Actualizador Global de Barra Lateral UI
 */
document.addEventListener('DOMContentLoaded', () => {
    if (payloadIdentidad) {
        const nombreUsuario = payloadIdentidad.sub || localStorage.getItem('baezpos_user_name') || "Usuario";
        
        const idsNombre = ['userNameLabelHeader', 'userNameLabelSidebar', 'userName'];
        idsNombre.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerText = nombreUsuario;
        });

        const avatar = document.getElementById('userInitial');
        if (avatar) avatar.innerText = nombreUsuario.charAt(0).toUpperCase();

        const rollLabel = document.getElementById('userRoleMenu');
        const rolLocal = localStorage.getItem('baezpos_user_role') || '';

        if(rollLabel) {
            // Cambiado de "Cajero" a "Vendedor"
            rollLabel.innerText = rolLocal === 'ADMIN' ? "Administrador" : "Vendedor";
        }

        // Restringir visualmente opciones del menú solo-admin
        if (rolLocal !== 'ADMIN') {
            const adminLinks = document.querySelectorAll('.only-admin');
            adminLinks.forEach(link => {
                link.style.removeProperty('display'); // Limpiamos por las dudas
                link.setAttribute('style', 'display: none !important');
            });
        }
    }
});
