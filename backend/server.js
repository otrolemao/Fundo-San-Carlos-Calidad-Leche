require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Conexión a Supabase (PostgreSQL)
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Ruta de prueba (GET)
app.get('/', (req, res) => {
    res.json({ mensaje: 'API de Calidad de Leche funcionando 🚀' });
});

// Ruta para obtener todas las muestras (GET)
app.get('/api/muestras', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM muestras_calidad');
        res.json(result.rows);
    } catch (err) {
        console.error("Error de BD:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// Ruta para insertar una nueva muestra (POST)
app.post('/api/muestras', async (req, res) => {
    try {
        const { lote_id, registrado_por, valor_ph, temperatura, volumen_litros } = req.body;
        
        const query = `
            INSERT INTO muestras_calidad (lote_id, registrado_por, valor_ph, temperatura, volumen_litros) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `;
        
        const values = [lote_id, registrado_por, valor_ph, temperatura, volumen_litros];
        const result = await pool.query(query, values);
        
        res.status(201).json({ mensaje: "Muestra guardada exitosamente", data: result.rows[0] });
    } catch (err) {
        console.error("Error al insertar:", err.message);
        res.status(500).json({ error: err.message });
    }
});

// --- RUTAS DE AUTENTICACIÓN ---
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Buscar usuario en la BD
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        const usuario = result.rows[0];
        
        // Comparar contraseña encriptada
        const validPassword = await bcrypt.compare(password, usuario.password_hash);
        
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        
        // Crear el Token JWT
        const token = jwt.sign(
            { id: usuario.id, rol_id: usuario.rol_id, nombre: usuario.nombre }, 
            'SECRETO_SUPER_SEGURO',
            { expiresIn: '2h' }
        );
        
        // Devolver respuesta con ID, Token, Rol y Nombre
        res.json({ 
            mensaje: 'Login exitoso', 
            token: token, 
            rol: usuario.rol_id, 
            nombre: usuario.nombre,
            id: usuario.id // <-- IMPORTANTE: Agregamos el ID
        });
        
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});