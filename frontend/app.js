const API_URL = 'http://localhost:3001/api/muestras';

// Referencias al DOM
const form = document.getElementById('form-muestra');
const tabla = document.getElementById('tabla-muestras');
const mensajeDiv = document.getElementById('mensaje');
const btnActualizar = document.getElementById('btn-actualizar');

// --- VERIFICACIÓN DE SESIÓN Y ROLES ---
const token = localStorage.getItem('token');
const rol = localStorage.getItem('rol');
const userId = localStorage.getItem('userId');

if (!token) {
    window.location.href = 'login.html';
}

// Lógica de visibilidad según el rol
document.addEventListener('DOMContentLoaded', () => {
    // Si es Operador (3), ocultamos el botón de actualizar datos generales
    if (rol === '3') {
        if (btnActualizar) btnActualizar.style.display = 'none';
    }

    // Si es Admin (1), podríamos mostrar un botón extra de configuración
    if (rol === '1') {
        const header = document.querySelector('header');
        const btnConfig = document.createElement('button');
        btnConfig.textContent = '⚙️ CONFIGURACIÓN';
        btnConfig.style.cssText = 'background: none; border: 1px solid var(--color-ash-stroke); color: var(--color-signal-orange); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-family: var(--font-geist-mono); font-size: 11px; margin-left: 10px;';
        btnConfig.onclick = () => alert('Panel de configuración (Próximamente)');
        header.appendChild(btnConfig);
    }
});

// Botón de Cerrar Sesión
const btnLogout = document.getElementById('btn-logout');
if (btnLogout) {
    btnLogout.addEventListener('click', () => {
        localStorage.clear();
        window.location.href = 'login.html';
    });
}

// Función para cargar las muestras (GET)
async function cargarMuestras() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        tabla.innerHTML = '';
        
        // FILTRO POR ROL: Si es Operador, solo ve sus propias muestras
        const datosFiltrados = (rol === '3') 
            ? data.filter(m => m.registrado_por === userId) 
            : data;

        if (datosFiltrados.length === 0) {
            tabla.innerHTML = '<tr><td colspan="5">No hay muestras registradas.</td></tr>';
            return;
        }

        datosFiltrados.forEach(muestra => {
            let estado = 'Óptimo';
            let claseEstado = 'estado-optimo';
            
            if (muestra.valor_ph < 6.5) {
                estado = 'Crítico (Cortada)';
                claseEstado = 'estado-critico';
            } else if (muestra.valor_ph < 6.6) {
                estado = 'Alerta';
                claseEstado = 'estado-alerta';
            }

            const fecha = new Date(muestra.fecha_muestra).toLocaleString('es-CL');

            const fila = `
                <tr>
                    <td>${fecha}</td>
                    <td>${muestra.valor_ph}</td>
                    <td>${muestra.temperatura || '-'}</td>
                    <td>${muestra.volumen_litros}</td>
                    <td class="${claseEstado}">${estado}</td>
                </tr>
            `;
            tabla.innerHTML += fila;
        });
    } catch (error) {
        tabla.innerHTML = '<tr><td colspan="5">Error al cargar los datos.</td></tr>';
        console.error('Error:', error);
    }
}

// Evento para guardar una muestra (POST)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevaMuestra = {
        lote_id: "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        registrado_por: userId,
        valor_ph: parseFloat(document.getElementById('valor_ph').value),
        temperatura: parseFloat(document.getElementById('temperatura').value) || null,
        volumen_litros: parseFloat(document.getElementById('volumen_litros').value)
    };

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(nuevaMuestra)
        });

        if (response.ok) {
            mensajeDiv.textContent = '¡Muestra guardada exitosamente!';
            mensajeDiv.className = 'mensaje exito';
            form.reset();
            cargarMuestras();
        } else {
            const errorData = await response.json();
            mensajeDiv.textContent = `Error: ${errorData.error}`;
            mensajeDiv.className = 'mensaje error';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión.';
        mensajeDiv.className = 'mensaje error';
    }

    setTimeout(() => {
        mensajeDiv.className = 'mensaje';
    }, 3000);
});

// Evento para actualizar manualmente (solo si el botón existe)
if (btnActualizar) {
    btnActualizar.addEventListener('click', cargarMuestras);
}

// Cargar datos al iniciar
document.addEventListener('DOMContentLoaded', cargarMuestras);