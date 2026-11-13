/* ==========================================================
   SISTEMA DE CALIDAD DE LECHE · Lógica de sesión y roles
   Rol 1 = Administrador · Rol 2 = Supervisor · Rol 3 = Operador
   ========================================================== */

const API_URL = 'http://localhost:3001/api/muestras';
const RUTA_LOGIN = 'login.html';
const LOTE_POR_DEFECTO = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const ROLES = {
    '1': { clave: 'admin', nombre: 'Administrador' },
    '2': { clave: 'supervisor', nombre: 'Supervisor' },
    '3': { clave: 'operador', nombre: 'Operador' }
};

// --- Sesión (localStorage) ---
const token = localStorage.getItem('token');
const rol = normalizar(localStorage.getItem('rol'));
const userId = normalizar(localStorage.getItem('userId'));
const nombreUsuario = (localStorage.getItem('nombre') || '').trim();

if (!token) {
    window.location.replace(RUTA_LOGIN);
}

// --- Referencias al DOM ---
const form = document.getElementById('form-muestra');
const tabla = document.getElementById('tabla-muestras');
const mensajeDiv = document.getElementById('mensaje');
const btnActualizar = document.getElementById('btn-actualizar');
const btnConfig = document.getElementById('btn-config');
const btnLogout = document.getElementById('btn-logout');
const btnCerrarConfig = document.getElementById('btn-cerrar-config');
const modalConfig = document.getElementById('modal-config');
const seccionFormulario = document.getElementById('seccion-formulario');
const contenido = document.getElementById('contenido-principal');
const rolBadge = document.getElementById('rol-badge');
const rolBadgeTexto = document.getElementById('rol-badge-texto');
const seccionGrafico = document.getElementById('seccion-grafico');
const seccionPrecio = document.getElementById('seccion-precio');
const canvasGrafico = document.getElementById('grafico-ph');
const graficoVacio = document.getElementById('grafico-vacio');

// Elementos de selección/eliminación
const thCheckbox = document.getElementById('th-checkbox');
const checkTodos = document.getElementById('check-todos');
const btnSeleccionarTodo = document.getElementById('btn-seleccionar-todo');
const btnEliminar = document.getElementById('btn-eliminar-seleccionados');
const accionesTabla = document.getElementById('acciones-tabla');

// Instancia de Chart.js
let graficoPh = null;

function normalizar(valor) {
    return String(valor ?? '').trim();
}

function rolActual() {
    return ROLES[rol] ? rol : null;
}

/* ----------------------------------------------------------
   Interfaz según el rol
   ---------------------------------------------------------- */
function aplicarInterfazPorRol() {
    const clave = rolActual();
    const esAdmin = clave === '1';
    const esSupervisor = clave === '2';
    const esOperador = clave === '3';

    // Formulario: Admin y Operador. Supervisor y sesiones sin rol válido no registran.
    if (seccionFormulario) {
        seccionFormulario.hidden = esSupervisor || !clave;
    }

    // Actualizar Datos: visible salvo para Operador
    if (btnActualizar) {
        btnActualizar.hidden = esOperador;
    }

    // Configuración: solo Administrador.
    if (btnConfig) {
        btnConfig.hidden = !esAdmin;
    }

    // Gráfico: Admin y Supervisor. Precios: solo Admin.
    if (seccionGrafico) {
        seccionGrafico.hidden = !(esAdmin || esSupervisor);
    }
    if (seccionPrecio) {
        seccionPrecio.hidden = !esAdmin;
    }

    // Si no hay formulario, la tabla ocupa todo el ancho.
    if (contenido) {
        contenido.classList.toggle('container--full', seccionFormulario ? seccionFormulario.hidden : false);
    }

    // Badge de rol
    if (rolBadge && rolBadgeTexto) {
        const info = clave ? ROLES[clave] : null;
        rolBadge.className = `rol-badge rol-badge--${info ? info.clave : 'desconocido'}`;
        rolBadgeTexto.textContent = info ? info.nombre.toUpperCase() : 'SIN ROL';
    }

    // Datos de sesión en configuración
    const configNombre = document.getElementById('config-nombre');
    const configRol = document.getElementById('config-rol');
    const configId = document.getElementById('config-id');
    if (configNombre) configNombre.textContent = nombreUsuario || 'Sin nombre';
    if (configRol) configRol.textContent = clave ? ROLES[clave].nombre : 'Sin rol asignado';
    if (configId) configId.textContent = userId || 'No disponible';

    // --- Lógica de Eliminación (Solo Admin) ---
    if (esAdmin) {
        if (thCheckbox) thCheckbox.style.display = 'table-cell';
        if (accionesTabla) accionesTabla.style.display = 'flex';
    } else {
        if (thCheckbox) thCheckbox.style.display = 'none';
        if (accionesTabla) accionesTabla.style.display = 'none';
    }
}

/* ----------------------------------------------------------
   Tabla
   ---------------------------------------------------------- */
function evaluarPh(valorPh) {
    const ph = Number(valorPh);
    if (ph < 6.5) return { estado: 'Crítico (Cortada)', clase: 'estado-critico' };
    if (ph < 6.6) return { estado: 'Alerta', clase: 'estado-alerta' };
    return { estado: 'Óptimo', clase: 'estado-optimo' };
}

function crearCelda(texto) {
    const td = document.createElement('td');
    td.textContent = texto;
    return td;
}

function mostrarMensajeTabla(texto) {
    if (!tabla) return;
    tabla.replaceChildren();
    const fila = document.createElement('tr');
    const celda = document.createElement('td');
    // Si es Admin, la tabla tiene 6 columnas (1 checkbox + 5 datos). Si no, 5.
    celda.colSpan = rolActual() === '1' ? 6 : 5;
    celda.textContent = texto;
    fila.appendChild(celda);
    tabla.appendChild(fila);
}

function renderMuestras(muestras) {
    if (!tabla) return;

    const esAdmin = rolActual() === '1';

    if (muestras.length === 0) {
        mostrarMensajeTabla(rolActual() === '3' ? 'Aún no tienes muestras registradas.' : 'No hay muestras registradas.');
        return;
    }

    const fragmento = document.createDocumentFragment();

    muestras.forEach((muestra) => {
        const fila = document.createElement('tr');
        fila.dataset.id = muestra.id;

        // Columna de checkbox SOLO para Admin
        if (esAdmin) {
            const tdCheck = document.createElement('td');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.className = 'check-fila';
            checkbox.value = muestra.id;
            tdCheck.appendChild(checkbox);
            fila.appendChild(tdCheck);
        }

        const fecha = muestra.fecha_muestra ? new Date(muestra.fecha_muestra).toLocaleString('es-CL') : '-';
        fila.appendChild(crearCelda(fecha));
        fila.appendChild(crearCelda(muestra.valor_ph));
        fila.appendChild(crearCelda(muestra.temperatura ?? '-'));
        fila.appendChild(crearCelda(muestra.volumen_litros));

        const { estado, clase } = evaluarPh(muestra.valor_ph);
        const celdaEstado = document.createElement('td');
        celdaEstado.className = clase;
        celdaEstado.textContent = estado;
        fila.appendChild(celdaEstado);

        fragmento.appendChild(fila);
    });

    tabla.replaceChildren(fragmento);
}

function filtrarMuestrasPorRol(muestras) {
    if (rolActual() !== '3') return muestras;
    if (!userId) return [];
    const idSesion = userId.toLowerCase();
    return muestras.filter((muestra) => normalizar(muestra.registrado_por).toLowerCase() === idSesion);
}

/* ----------------------------------------------------------
   Gráfico y Precios
   ---------------------------------------------------------- */
const FUENTE_MONO = "'JetBrains Mono', monospace";

function fechaValida(valor) {
    const fecha = new Date(valor);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function muestrasOrdenadasPorFecha(muestras, ascendente = true) {
    return [...muestras]
        .filter((muestra) => fechaValida(muestra.fecha_muestra))
        .sort((a, b) => {
            const diferencia = fechaValida(a.fecha_muestra) - fechaValida(b.fecha_muestra);
            return ascendente ? diferencia : -diferencia;
        });
}

function renderGrafico(muestras) {
    if (!seccionGrafico || seccionGrafico.hidden || !canvasGrafico) return;
    if (graficoPh) { graficoPh.destroy(); graficoPh = null; }

    if (typeof Chart === 'undefined') {
        canvasGrafico.hidden = true;
        if (graficoVacio) { graficoVacio.hidden = false; graficoVacio.textContent = 'No se pudo cargar Chart.js.'; }
        return;
    }

    const datos = muestrasOrdenadasPorFecha(muestras);
    const hayDatos = datos.length > 0;
    canvasGrafico.hidden = !hayDatos;
    if (graficoVacio) {
        graficoVacio.hidden = hayDatos;
        graficoVacio.textContent = 'Sin datos para graficar.';
    }
    if (!hayDatos) return;

    const etiquetas = datos.map((m) => fechaValida(m.fecha_muestra).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }));
    const valores = datos.map((m) => Number(m.valor_ph));
    const limite = datos.map(() => 6.5);

    graficoPh = new Chart(canvasGrafico, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [
                { label: 'pH', data: valores, borderColor: '#ee6018', backgroundColor: 'rgba(238, 96, 24, 0.12)', borderWidth: 2, pointRadius: 4, pointBackgroundColor: '#ee6018', tension: 0.35, fill: true },
                { label: 'Límite crítico 6.5', data: limite, borderColor: '#ff4d4d', borderDash: [6, 6], borderWidth: 1.5, pointRadius: 0, fill: false }
            ],
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: '#b8b3b0', font: { family: FUENTE_MONO, size: 10 } } } },
            scales: {
                x: { grid: { color: 'rgba(255, 255, 255, 0.04)' }, ticks: { color: '#6f6b68', font: { family: FUENTE_MONO, size: 9 } } },
                y: { suggestedMin: 6.0, suggestedMax: 7.0, grid: { color: 'rgba(255, 255, 255, 0.05)' }, ticks: { color: '#6f6b68', font: { family: FUENTE_MONO, size: 10 } } },
            },
        },
    });
}

const formatoMoneda = new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 });

function precioPorLitro(ph) {
    if (ph >= 6.6) return 450;
    if (ph >= 6.5) return 400;
    return 0;
}

function actualizarPrecio(muestras) {
    if (!seccionPrecio || seccionPrecio.hidden) return;
    const phEl = document.getElementById('precio-ph');
    const fechaEl = document.getElementById('precio-fecha');
    const precioEl = document.getElementById('precio-por-litro');
    const reglaEl = document.getElementById('precio-regla');
    const volumenEl = document.getElementById('precio-volumen');
    const totalEl = document.getElementById('precio-total');
    if (!phEl || !precioEl || !volumenEl || !totalEl) return;

    const [ultima] = muestrasOrdenadasPorFecha(muestras, false);
    if (!ultima) {
        phEl.textContent = '—'; if (fechaEl) fechaEl.textContent = 'Sin registros';
        precioEl.textContent = '—'; if (reglaEl) reglaEl.textContent = 'Regla según pH';
        volumenEl.textContent = '—'; totalEl.textContent = '—';
        return;
    }

    const ph = Number(ultima.valor_ph);
    const precio = precioPorLitro(ph);
    const volumen = Number(ultima.volumen_litros) || 0;
    const total = precio * volumen;
    const fecha = fechaValida(ultima.fecha_muestra);

    phEl.textContent = Number.isFinite(ph) ? ph.toFixed(2) : '—';
    if (fechaEl) fechaEl.textContent = fecha ? fecha.toLocaleString('es-CL') : 'Sin fecha';
    precioEl.textContent = formatoMoneda.format(precio);
    if (reglaEl) {
        reglaEl.textContent = precio === 450 ? 'pH ≥ 6.6 · calidad óptima' : precio === 400 ? 'pH 6.5–6.6 · alerta' : 'pH < 6.5 · leche cortada';
    }
    volumenEl.textContent = `${volumen.toLocaleString('es-CL')} L`;
    totalEl.textContent = formatoMoneda.format(total);
}

/* ----------------------------------------------------------
   Carga de datos
   ---------------------------------------------------------- */
async function cargarMuestras() {
    if (!tabla) return;
    if (rolActual() === '3' && !userId) { mostrarMensajeTabla('No se pudo identificar tu usuario.'); return; }

    mostrarMensajeTabla('Cargando datos...');

    try {
        const respuesta = await fetch(API_URL, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (respuesta.status === 401) { cerrarSesion(); return; }
        if (!respuesta.ok) throw new Error(`HTTP ${respuesta.status}`);

        const datos = await respuesta.json();
        if (!Array.isArray(datos)) throw new Error('Respuesta inválida');

        const visibles = filtrarMuestrasPorRol(datos);
        renderMuestras(visibles);
        renderGrafico(visibles);
        actualizarPrecio(visibles);
    } catch (error) {
        console.error('Error al cargar muestras:', error);
        mostrarMensajeTabla('Error al cargar los datos.');
        renderGrafico([]);
        actualizarPrecio([]);
    }
}

/* ----------------------------------------------------------
   Mensajes
   ---------------------------------------------------------- */
let temporizadorMensaje = null;
function mostrarMensaje(texto, tipo) {
    if (!mensajeDiv) return;
    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje ${tipo}`;
    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => { mensajeDiv.className = 'mensaje'; }, 3000);
}

/* ----------------------------------------------------------
   Eventos
   ---------------------------------------------------------- */
if (form) {
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();
        const clave = rolActual();
        if (clave !== '1' && clave !== '3') { mostrarMensaje('Tu rol no tiene permiso.', 'error'); return; }
        if (!userId) { mostrarMensaje('Sesión sin ID.', 'error'); return; }

        const loteInput = document.getElementById('lote_id');
        const nuevaMuestra = {
            lote_id: loteInput ? loteInput.value : LOTE_POR_DEFECTO,
            registrado_por: userId,
            valor_ph: parseFloat(document.getElementById('valor_ph').value),
            temperatura: parseFloat(document.getElementById('temperatura').value) || null,
            volumen_litros: parseFloat(document.getElementById('volumen_litros').value)
        };

        try {
            const respuesta = await fetch(API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify(nuevaMuestra)
            });
            if (respuesta.status === 401) { cerrarSesion(); return; }
            if (respuesta.ok) {
                mostrarMensaje('¡Muestra guardada exitosamente!', 'exito');
                form.reset();
                await cargarMuestras();
            } else {
                const errorData = await respuesta.json().catch(() => ({}));
                mostrarMensaje(`Error: ${errorData.error || 'no se pudo guardar'}`, 'error');
            }
        } catch (error) {
            mostrarMensaje('Error de conexión.', 'error');
        }
    });
}

if (btnActualizar) btnActualizar.addEventListener('click', cargarMuestras);

function cerrarSesion() {
    ['token', 'rol', 'nombre', 'userId'].forEach((clave) => localStorage.removeItem(clave));
    window.location.replace(RUTA_LOGIN);
}
if (btnLogout) btnLogout.addEventListener('click', cerrarSesion);

if (btnConfig && modalConfig) {
    btnConfig.addEventListener('click', () => { if (typeof modalConfig.showModal === 'function') modalConfig.showModal(); else modalConfig.setAttribute('open', ''); });
    if (btnCerrarConfig) btnCerrarConfig.addEventListener('click', () => modalConfig.close());
    modalConfig.addEventListener('click', (e) => { if (e.target === modalConfig) modalConfig.close(); });
}

// --- SELECCIÓN Y ELIMINACIÓN ---
if (checkTodos) {
    checkTodos.addEventListener('change', (e) => {
        const checks = tabla.querySelectorAll('.check-fila');
        checks.forEach(chk => chk.checked = e.target.checked);
    });
}

if (btnSeleccionarTodo) {
    btnSeleccionarTodo.addEventListener('click', () => {
        const checks = tabla.querySelectorAll('.check-fila');
        const todosMarcados = Array.from(checks).every(chk => chk.checked);
        checks.forEach(chk => chk.checked = !todosMarcados);
        if (checkTodos) checkTodos.checked = !todosMarcados;
    });
}

if (btnEliminar) {
    btnEliminar.addEventListener('click', async () => {
        const checks = tabla.querySelectorAll('.check-fila:checked');
        const ids = Array.from(checks).map(chk => chk.value);

        if (ids.length === 0) { alert('Selecciona al menos una muestra.'); return; }
        if (!confirm(`¿Eliminar ${ids.length} muestra(s)?`)) return;

        try {
            const response = await fetch(API_URL, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ ids })
            });
            if (response.ok) {
                alert('Muestras eliminadas.');
                cargarMuestras();
            } else {
                const error = await response.json();
                alert(`Error: ${error.error}`);
            }
        } catch (error) {
            alert('Error de conexión.');
        }
    });
}

/* ----------------------------------------------------------
   Arranque
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    aplicarInterfazPorRol();
    cargarMuestras();
});