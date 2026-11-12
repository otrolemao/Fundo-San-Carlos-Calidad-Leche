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

        renderMuestras(filtrarMuestrasPorRol(datos));
    } catch (error) {
        console.error('Error al cargar muestras:', error);
        mostrarMensajeTabla('Error al cargar los datos. Verifica que el backend esté corriendo.');
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
