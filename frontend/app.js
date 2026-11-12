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

// Instancia de Chart.js (se destruye antes de cada redibujado)
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

    // Actualizar Datos: visible salvo para Operador (su tabla se refresca al registrar).
    if (btnActualizar) {
        btnActualizar.hidden = esOperador;
    }

    // Configuración: solo Administrador.
    if (btnConfig) {
        btnConfig.hidden = !esAdmin;
    }

    // Gráfico de tendencia: Admin y Supervisor. Deductor de precios: solo Admin.
    if (seccionGrafico) {
        seccionGrafico.hidden = !(esAdmin || esSupervisor);
    }

    if (seccionPrecio) {
        seccionPrecio.hidden = !esAdmin;
    }

    // Si no hay formulario, la tabla ocupa todo el ancho disponible.
    if (contenido) {
        contenido.classList.toggle('container--full', seccionFormulario ? seccionFormulario.hidden : false);
    }

    // Badge de rol en el header
    if (rolBadge && rolBadgeTexto) {
        const info = clave ? ROLES[clave] : null;
        rolBadge.className = `rol-badge rol-badge--${info ? info.clave : 'desconocido'}`;
        rolBadgeTexto.textContent = info ? info.nombre.toUpperCase() : 'SIN ROL';
        rolBadge.title = info
            ? `${nombreUsuario || 'Usuario'} · ${info.nombre}`
            : 'Sin rol asignado en la sesión';
    }

    // Datos de la sesión en el panel de configuración
    const configNombre = document.getElementById('config-nombre');
    const configRol = document.getElementById('config-rol');
    const configId = document.getElementById('config-id');

    if (configNombre) configNombre.textContent = nombreUsuario || 'Sin nombre';
    if (configRol) configRol.textContent = clave ? ROLES[clave].nombre : 'Sin rol asignado';
    if (configId) configId.textContent = userId || 'No disponible';
}

/* ----------------------------------------------------------
   Tabla
   ---------------------------------------------------------- */
function evaluarPh(valorPh) {
    const ph = Number(valorPh);

    if (ph < 6.5) {
        return { estado: 'Crítico (Cortada)', clase: 'estado-critico' };
    }
    if (ph < 6.6) {
        return { estado: 'Alerta', clase: 'estado-alerta' };
    }
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
    celda.colSpan = 5;
    celda.textContent = texto;
    fila.appendChild(celda);
    tabla.appendChild(fila);
}

function renderMuestras(muestras) {
    if (!tabla) return;

    if (muestras.length === 0) {
        mostrarMensajeTabla(rolActual() === '3'
            ? 'Aún no tienes muestras registradas.'
            : 'No hay muestras registradas.');
        return;
    }

    const fragmento = document.createDocumentFragment();

    muestras.forEach((muestra) => {
        const fila = document.createElement('tr');

        const fecha = muestra.fecha_muestra
            ? new Date(muestra.fecha_muestra).toLocaleString('es-CL')
            : '-';

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

// El Operador solo ve sus propias muestras (registrado_por === userId).
function filtrarMuestrasPorRol(muestras) {
    if (rolActual() !== '3') return muestras;
    if (!userId) return [];

    const idSesion = userId.toLowerCase();
    return muestras.filter((muestra) =>
        normalizar(muestra.registrado_por).toLowerCase() === idSesion
    );
}

/* ----------------------------------------------------------
   Módulo de gráficos (Chart.js)
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

    // Destruir la instancia anterior evita el error "Canvas is already in use".
    if (graficoPh) {
        graficoPh.destroy();
        graficoPh = null;
    }

    if (typeof Chart === 'undefined') {
        canvasGrafico.hidden = true;
        if (graficoVacio) {
            graficoVacio.hidden = false;
            graficoVacio.textContent = 'No se pudo cargar Chart.js. Revisa tu conexión a internet.';
        }
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

    const etiquetas = datos.map((muestra) =>
        fechaValida(muestra.fecha_muestra).toLocaleString('es-CL', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
        })
    );
    const valores = datos.map((muestra) => Number(muestra.valor_ph));
    const limite = datos.map(() => 6.5);

    graficoPh = new Chart(canvasGrafico, {
        type: 'line',
        data: {
            labels: etiquetas,
            datasets: [
                {
                    label: 'pH',
                    data: valores,
                    borderColor: '#ee6018',
                    backgroundColor: 'rgba(238, 96, 24, 0.12)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#ee6018',
                    pointBorderColor: '#0b0b0c',
                    pointBorderWidth: 2,
                    tension: 0.35,
                    fill: true,
                },
                {
                    label: 'Límite crítico 6.5',
                    data: limite,
                    borderColor: '#ff4d4d',
                    borderDash: [6, 6],
                    borderWidth: 1.5,
                    pointRadius: 0,
                    pointHoverRadius: 0,
                    fill: false,
                },
            ],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: { duration: 450 },
            interaction: { mode: 'index', intersect: false },
            plugins: {
                legend: {
                    labels: {
                        color: '#b8b3b0',
                        font: { family: FUENTE_MONO, size: 10 },
                        boxWidth: 12,
                        boxHeight: 2,
                    },
                },
                tooltip: {
                    backgroundColor: '#141416',
                    borderColor: '#2a2a2e',
                    borderWidth: 1,
                    titleColor: '#ececec',
                    bodyColor: '#b8b3b0',
                    titleFont: { family: FUENTE_MONO, size: 11 },
                    bodyFont: { family: FUENTE_MONO, size: 11 },
                    padding: 10,
                    callbacks: {
                        label: (contexto) =>
                            ` ${contexto.dataset.label}: ${Number(contexto.parsed.y).toFixed(2)}`,
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255, 255, 255, 0.04)' },
                    border: { color: '#2a2a2e' },
                    ticks: {
                        color: '#6f6b68',
                        font: { family: FUENTE_MONO, size: 9 },
                        maxRotation: 0,
                        autoSkip: true,
                        maxTicksLimit: 8,
                    },
                },
                y: {
                    suggestedMin: 6.0,
                    suggestedMax: 7.0,
                    grid: { color: 'rgba(255, 255, 255, 0.05)' },
                    border: { color: '#2a2a2e' },
                    ticks: {
                        color: '#6f6b68',
                        font: { family: FUENTE_MONO, size: 10 },
                        callback: (valor) => Number(valor).toFixed(1),
                    },
                },
            },
        },
    });
}

/* ----------------------------------------------------------
   Deductor de precios (solo Administrador)
   ---------------------------------------------------------- */
const formatoMoneda = new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    maximumFractionDigits: 0,
});

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

    // La muestra más reciente, sin depender del orden que entregue la API.
    const [ultima] = muestrasOrdenadasPorFecha(muestras, false);

    if (!ultima) {
        phEl.textContent = '—';
        if (fechaEl) fechaEl.textContent = 'Sin registros';
        precioEl.textContent = '—';
        if (reglaEl) reglaEl.textContent = 'Regla según pH';
        volumenEl.textContent = '—';
        totalEl.textContent = '—';
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
        reglaEl.textContent = precio === 450
            ? 'pH ≥ 6.6 · calidad óptima'
            : precio === 400
                ? 'pH 6.5–6.6 · alerta'
                : 'pH < 6.5 · leche cortada';
    }
    volumenEl.textContent = `${volumen.toLocaleString('es-CL')} L`;
    totalEl.textContent = formatoMoneda.format(total);
}

async function cargarMuestras() {
    if (!tabla) return;

    if (rolActual() === '3' && !userId) {
        mostrarMensajeTabla('No se pudo identificar tu usuario. Vuelve a iniciar sesión.');
        return;
    }

    mostrarMensajeTabla('Cargando datos...');

    try {
        const respuesta = await fetch(API_URL, {
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (respuesta.status === 401) {
            cerrarSesion();
            return;
        }

        if (!respuesta.ok) {
            throw new Error(`HTTP ${respuesta.status}`);
        }

        const datos = await respuesta.json();
        if (!Array.isArray(datos)) {
            throw new Error('Respuesta inválida del servidor');
        }

        const visibles = filtrarMuestrasPorRol(datos);
        renderMuestras(visibles);
        renderGrafico(visibles);
        actualizarPrecio(visibles);
    } catch (error) {
        console.error('Error al cargar muestras:', error);
        mostrarMensajeTabla('Error al cargar los datos. Verifica que el backend esté corriendo.');
        renderGrafico([]);
        actualizarPrecio([]);
    }
}

/* ----------------------------------------------------------
   Mensajes del formulario
   ---------------------------------------------------------- */
let temporizadorMensaje = null;

function mostrarMensaje(texto, tipo) {
    if (!mensajeDiv) return;

    mensajeDiv.textContent = texto;
    mensajeDiv.className = `mensaje ${tipo}`;

    clearTimeout(temporizadorMensaje);
    temporizadorMensaje = setTimeout(() => {
        mensajeDiv.className = 'mensaje';
    }, 3000);
}

/* ----------------------------------------------------------
   Eventos
   ---------------------------------------------------------- */
if (form) {
    form.addEventListener('submit', async (evento) => {
        evento.preventDefault();

        // Solo Admin y Operador registran muestras.
        const clave = rolActual();
        if (clave !== '1' && clave !== '3') {
            mostrarMensaje('Tu rol no tiene permiso para registrar muestras.', 'error');
            return;
        }

        if (!userId) {
            mostrarMensaje('Sesión sin ID de usuario. Vuelve a iniciar sesión.', 'error');
            return;
        }

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
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { Authorization: `Bearer ${token}` } : {})
                },
                body: JSON.stringify(nuevaMuestra)
            });

            if (respuesta.status === 401) {
                cerrarSesion();
                return;
            }

            if (respuesta.ok) {
                mostrarMensaje('¡Muestra guardada exitosamente!', 'exito');
                form.reset();
                await cargarMuestras();
            } else {
                const errorData = await respuesta.json().catch(() => ({}));
                mostrarMensaje(`Error: ${errorData.error || 'no se pudo guardar la muestra'}`, 'error');
            }
        } catch (error) {
            console.error('Error al guardar muestra:', error);
            mostrarMensaje('Error de conexión con el servidor.', 'error');
        }
    });
}

if (btnActualizar) {
    btnActualizar.addEventListener('click', cargarMuestras);
}

function cerrarSesion() {
    ['token', 'rol', 'nombre', 'userId'].forEach((clave) => localStorage.removeItem(clave));
    window.location.replace(RUTA_LOGIN);
}

if (btnLogout) {
    btnLogout.addEventListener('click', cerrarSesion);
}

/* Panel de configuración (solo Admin) */
if (btnConfig && modalConfig) {
    btnConfig.addEventListener('click', () => {
        if (typeof modalConfig.showModal === 'function') {
            modalConfig.showModal();
        } else {
            modalConfig.setAttribute('open', '');
        }
    });

    if (btnCerrarConfig) {
        btnCerrarConfig.addEventListener('click', () => modalConfig.close());
    }

    // Cerrar al hacer clic fuera del panel
    modalConfig.addEventListener('click', (evento) => {
        if (evento.target === modalConfig) modalConfig.close();
    });
}

/* ----------------------------------------------------------
   Arranque
   ---------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    aplicarInterfazPorRol();
    cargarMuestras();
});
