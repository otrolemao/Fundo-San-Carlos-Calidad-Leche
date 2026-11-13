require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: falta la variable JWT_SECRET en el archivo .env');
    process.exit(1);
}

const ROL_ADMIN = 1;
const ROL_SUPERVISOR = 2;
const ROL_OPERADOR = 3;

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

// --- MIDDLEWARE DE AUTENTICACIÓN JWT ---
function autenticarToken(req, res, next) {
    const header = req.headers.authorization || '';
    const [esquema, token] = header.split(' ');

    if (!token || esquema.toLowerCase() !== 'bearer') {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, payload) => {
        if (err) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }
        req.usuario = { id: payload.id, rol_id: Number(payload.rol_id), nombre: payload.nombre };
        next();
    });
}

// --- RUTAS PÚBLICAS ---
app.get('/', (req, res) => {
    res.json({ mensaje: 'API de Calidad de Leche funcionando 🚀' });
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }
        const result = await pool.query('SELECT * FROM usuarios WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const usuario = result.rows[0];
        const validPassword = await bcrypt.compare(password, usuario.password_hash);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }
        const token = jwt.sign(
            { id: usuario.id, rol_id: usuario.rol_id, nombre: usuario.nombre },
            JWT_SECRET,
            { expiresIn: '2h', algorithm: 'HS256' }
        );
        res.json({
            mensaje: 'Login exitoso',
            token: token,
            rol: usuario.rol_id,
            nombre: usuario.nombre,
            id: usuario.id,
        });
    } catch (err) {
        console.error('Error en login:', err.message);
        res.status(500).json({ error: 'Error en el servidor' });
    }
});

// --- RUTAS PROTEGIDAS ---
app.get('/api/muestras', autenticarToken, async (req, res) => {
    try {
        const { rol_id, id } = req.usuario;
        if (rol_id === ROL_OPERADOR) {
            const result = await pool.query('SELECT * FROM muestras_calidad WHERE registrado_por = $1 ORDER BY fecha_muestra DESC', [id]);
            return res.json(result.rows);
        }
        if (rol_id === ROL_ADMIN || rol_id === ROL_SUPERVISOR) {
            const result = await pool.query('SELECT * FROM muestras_calidad ORDER BY fecha_muestra DESC');
            return res.json(result.rows);
        }
        return res.status(403).json({ error: 'Rol no autorizado' });
    } catch (err) {
        console.error('Error de BD:', err.message);
        res.status(500).json({ error: 'Error al obtener las muestras' });
    }
});

app.post('/api/muestras', autenticarToken, async (req, res) => {
    try {
        const { rol_id, id } = req.usuario;
        if (rol_id !== ROL_ADMIN && rol_id !== ROL_OPERADOR) {
            return res.status(403).json({ error: 'Tu rol no tiene permiso para registrar muestras' });
        }
        const registrado_por = id;
        const { lote_id } = req.body;
        const valor_ph = Number(req.body.valor_ph);
        const volumen_litros = Number(req.body.volumen_litros);
        const temperatura = req.body.temperatura == null || req.body.temperatura === '' ? null : Number(req.body.temperatura);

        if (!lote_id) return res.status(400).json({ error: 'El lote es obligatorio' });
        if (!Number.isFinite(valor_ph) || valor_ph < 0 || valor_ph > 14) {
            return res.status(400).json({ error: 'El pH debe ser un número entre 0 y 14' });
        }
        if (!Number.isFinite(volumen_litros) || volumen_litros <= 0) {
            return res.status(400).json({ error: 'El volumen debe ser un número mayor a 0' });
        }

        const query = `
            INSERT INTO muestras_calidad (lote_id, registrado_por, valor_ph, temperatura, volumen_litros) 
            VALUES ($1, $2, $3, $4, $5) RETURNING *
        `;
        const values = [lote_id, registrado_por, valor_ph, temperatura, volumen_litros];
        const result = await pool.query(query, values);
        res.status(201).json({ mensaje: 'Muestra guardada exitosamente', data: result.rows[0] });
    } catch (err) {
        console.error('Error al insertar:', err.message);
        res.status(500).json({ error: 'Error al guardar la muestra' });
    }
});

// --- RUTA PARA ELIMINAR (Solo Admin) ---
app.delete('/api/muestras', autenticarToken, async (req, res) => {
    try {
        if (req.usuario.rol_id !== ROL_ADMIN) {
            return res.status(403).json({ error: 'Solo el Administrador puede eliminar muestras' });
        }
        const { ids } = req.body;
        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return res.status(400).json({ error: 'No se proporcionaron IDs para eliminar' });
        }
        const query = 'DELETE FROM muestras_calidad WHERE id = ANY($1::uuid[]) RETURNING id';
        const result = await pool.query(query, [ids]);
        res.json({ mensaje: 'Muestras eliminadas exitosamente', eliminadas: result.rowCount });
    } catch (err) {
        console.error('Error al eliminar:', err.message);
        res.status(500).json({ error: 'Error al eliminar las muestras' });
    }
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});