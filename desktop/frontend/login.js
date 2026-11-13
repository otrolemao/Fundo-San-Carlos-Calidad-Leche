const API_URL = 'https://fundo-san-carlos-backend.onrender.com/api/auth/login';

const formLogin = document.getElementById('form-login');
const mensajeDiv = document.getElementById('mensaje-login');

// --- LÓGICA PARA MOSTRAR/OCULTAR CONTRASEÑA ---
const togglePassword = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');

if (togglePassword && passwordInput) {
    togglePassword.addEventListener('click', () => {
        // Cambiar el tipo de input
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        passwordInput.setAttribute('type', type);
        
        // Cambiar el ícono (ojo abierto / ojo tachado)
        const icon = togglePassword.querySelector('i');
        if (type === 'password') {
            icon.classList.remove('fa-eye-slash');
            icon.classList.add('fa-eye');
            togglePassword.setAttribute('aria-label', 'Mostrar contraseña');
        } else {
            icon.classList.remove('fa-eye');
            icon.classList.add('fa-eye-slash');
            togglePassword.setAttribute('aria-label', 'Ocultar contraseña');
        }
    });
}

// --- LÓGICA DE LOGIN ---
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