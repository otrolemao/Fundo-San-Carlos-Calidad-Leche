const API_URL = 'http://localhost:3001/api/auth/login';

const formLogin = document.getElementById('form-login');
const mensajeDiv = document.getElementById('mensaje-login');

formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar datos de sesión en el navegador
            localStorage.setItem('token', data.token);
            localStorage.setItem('rol', data.rol);
            localStorage.setItem('nombre', data.nombre);
            localStorage.setItem('userId', data.id); // <-- IMPORTANTE: Guardamos el ID
            
            mensajeDiv.textContent = `Bienvenido, ${data.nombre}. Redirigiendo...`;
            mensajeDiv.className = 'mensaje exito';
            
            // Redirigir a la página principal después de 1 segundo
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            mensajeDiv.textContent = data.error || 'Error al iniciar sesión';
            mensajeDiv.className = 'mensaje error';
        }
    } catch (error) {
        mensajeDiv.textContent = 'Error de conexión con el servidor.';
        mensajeDiv.className = 'mensaje error';
    }
});