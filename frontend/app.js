const API_URL = 'http://localhost:3001/api/muestras';

// Referencias al DOM
const form = document.getElementById('form-muestra');
const tabla = document.getElementById('tabla-muestras');
const mensajeDiv = document.getElementById('mensaje');
const btnActualizar = document.getElementById('btn-actualizar');

// Función para cargar las muestras (GET)
async function cargarMuestras() {
    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        tabla.innerHTML = ''; // Limpiar tabla
        
        if (data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="5">No hay muestras registradas.</td></tr>';
            return;
        }

        data.forEach(muestra => {
            // Lógica del semáforo de pH
            let estado = 'Óptimo';
            let claseEstado = 'estado-optimo';
            
            if (muestra.valor_ph < 6.5) {
                estado = 'Crítico (Cortada)';
                claseEstado = 'estado-critico';
            } else if (muestra.valor_ph < 6.6) {
                estado = 'Alerta';
                claseEstado = 'estado-alerta';
            }

            // Formatear fecha
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
        tabla.innerHTML = '<tr><td colspan="5">Error al cargar los datos. Asegúrate de que el backend esté corriendo.</td></tr>';
        console.error('Error:', error);
    }
}

// Evento para guardar una muestra (POST)
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const nuevaMuestra = {
        lote_id: document.getElementById('lote_id').value,
        registrado_por: document.getElementById('registrado_por').value,
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
            cargarMuestras(); // Recargar la tabla
        } else {
            const errorData = await response.json();
            mensajeDiv.textContent = `Error: ${errorData.error}`;
            mensajeDiv.className = 'mensaje error';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión con el servidor.';
        mensajeDiv.className = 'mensaje error';
    }

    // Ocultar el mensaje después de 3 segundos
    setTimeout(() => {
        mensajeDiv.className = 'mensaje';
    }, 3000);
});

// Evento para actualizar manualmente
btnActualizar.addEventListener('click', cargarMuestras);

// Cargar datos al iniciar la página
document.addEventListener('DOMContentLoaded', cargarMuestras);