document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('sidebar-container');
    if (!sidebarContainer) return;

    // Detectamos en qué página estamos para ponerle la clase 'active-page' automáticamente
    const paginaActual = window.location.pathname.split("/").pop() || "dashboard.html";

    // Inyectamos los estilos estructurales necesarios para evitar que rompa el layout
    const estilos = document.createElement('style');
    estilos.innerHTML = `
        #sidebar {
            width: 250px;
            height: 100vh;
            position: fixed;
            top: 0;
            left: 0;
            background: #212529 !important;
            z-index: 1000;
            transition: all 0.3s;
        }
        .nav-link {
            color: rgba(255,255,255,0.7) !important;
            padding: 12px 20px;
            border-radius: 8px;
            margin: 4px 12px;
            display: flex;
            align-items: center;
            text-decoration: none;
            transition: 0.2s;
        }
        .nav-link:hover {
            color: white !important;
            background: rgba(255,255,255,0.1) !important;
        }
        .nav-link.active-page {
            background-color: #0d6efd !important;
            font-weight: bold;
            color: white !important;
        }
        @media (max-width: 768px) {
            #sidebar { left: -250px !important; }
            #sidebar.active { left: 0 !important; }
        }
    `;
    document.head.appendChild(estilos);

    // Inyectamos el HTML del Sidebar
    sidebarContainer.innerHTML = `
        <nav id="sidebar" class="bg-dark vh-100 shadow">
          <div class="p-4 text-center">
            <h3 class="text-white fw-bold">BaezPOS</h3>
            <hr class="text-white">
          </div>
          <div class="nav flex-column px-3 gap-1">
            <a href="dashboard.html" class="nav-link only-admin text-white rounded p-2 ${paginaActual === 'dashboard.html' ? 'active-page' : ''}">
              <i class="bi bi-speedometer2 me-2"></i> Dashboard
            </a>
            <a href="productos.html" class="nav-link only-admin text-white rounded p-2 ${paginaActual === 'productos.html' ? 'active-page' : ''}">
              <i class="bi bi-box-seam me-2"></i> Productos
            </a>
            <a href="ventas.html" class="nav-link text-white rounded p-2 ${paginaActual === 'ventas.html' ? 'active-page' : ''}">
              <i class="bi bi-cart me-2"></i> Punto de Venta
            </a>
            <a href="clientes.html" class="nav-link text-white rounded p-2 ${paginaActual === 'clientes.html' ? 'active-page' : ''}">
              <i class="bi bi-people me-2"></i> Clientes (Libreta)
            </a>
            <a href="historial.html" class="nav-link only-admin text-white rounded p-2 ${paginaActual === 'historial.html' ? 'active-page' : ''}">
              <i class="bi bi-clock-history me-2"></i> Historial de Ventas
            </a>
            <a href="perfil.html" class="nav-link only-admin text-white rounded p-2 ${paginaActual === 'perfil.html' ? 'active-page' : ''}">
              <i class="bi bi-shop me-2"></i> Mi Negocio
            </a>
            <a href="empleados.html" class="nav-link text-white rounded p-2 only-admin ${paginaActual === 'empleados.html' ? 'active-page' : ''}">
              <i class="bi bi-person-badge-fill me-2"></i> Empleados
            </a>
            <a href="#" class="nav-link text-danger mt-5 p-2" onclick="cerrarSesion()">
              <i class="bi bi-box-arrow-left me-2"></i> Salir
            </a>
          </div>
        </nav>
    `;

    // Lógica opcional para el botón de colapso en móviles si existe en la vista
    const btnCollapse = document.getElementById('sidebarCollapse');
    if (btnCollapse) {
        btnCollapse.addEventListener('click', () => {
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.toggle('active');
        });
    }
});