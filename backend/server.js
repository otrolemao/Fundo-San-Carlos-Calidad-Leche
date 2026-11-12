require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;

// Secreto JWT: debe venir del .env, nunca hardcodeado.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    console.error('FATAL: falta la variable JWT_SECRET en el archivo .env');
    process.exit(1);
}

// Roles de la base de datos
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

/* ==========================================================
   MIDDLEWARE DE AUTENTICACIÓN JWT
   ========================================================== */
function autenticarToken(req, res, next) {
    const header = req.headers.authorization || '';
    const [esquema, token] = header.split(' ');

    if (!token || esquema.toLowerCase() !== 'bearer') {
        return res
            .status(401)
            .set('WWW-Authenticate', 'Bearer')
            .json({ error: 'Token no proporcionado' });
    }

    jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] }, (err, payload) => {
        if (err) {
            return res
                .status(401)
                .set('WWW-Authenticate', 'Bearer')
                .json({ error: 'Token inválido o expirado' });
        }

        if (!payload || !payload.id) {
            return res.status(401).json({ error: 'Token inválido o expirado' });
        }

        req.usuario = {
            id: payload.id,
            rol_id: Number(payload.rol_id),
            nombre: payload.nombre,
        };

        next();
    });
}

/* ==========================================================
   RUTAS PÚBLICAS
   ========================================================== */

// Ruta de prueba (GET)
app.get('/', (req, res) => {
    res.json({ mensaje: 'API de Calidad de Leche funcionando 🚀' });
});

// Login: devuelve el JWT firmado con JWT_SECRET
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
        }

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

        // Crear el Token JWT con el secreto del .env
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

/* ==========================================================
   RUTAS PROTEGIDAS
   ========================================================== */

// Obtener muestras: Admin y Supervisor ven todas, Operador solo las suyas.
app.get('/api/muestras', autenticarToken, async (req, res) => {
    try {
        const { rol_id, id } = req.usuario;

        if (rol_id === ROL_OPERADOR) {
            const result = await pool.query(
                'SELECT * FROM muestras_calidad WHERE registrado_por = $1',
                [id]
            );
            return res.json(result.rows);
        }

        if (rol_id === ROL_ADMIN || rol_id === ROL_SUPERVISOR) {
            const result = await pool.query('SELECT * FROM muestras_calidad');
            return res.json(result.rows);
        }

        return res.status(403).json({ error: 'Rol no autorizado' });
    } catch (err) {
        console.error('Error de BD:', err.message);
        res.status(500).json({ error: 'Error al obtener las muestras' });
    }
});

// Insertar una nueva muestra: solo Admin y Operador.
app.post('/api/muestras', autenticarToken, async (req, res) => {
    try {
        const { rol_id, id } = req.usuario;

        if (rol_id !== ROL_ADMIN && rol_id !== ROL_OPERADOR) {
            return res.status(403).json({ error: 'Tu rol no tiene permiso para registrar muestras' });
        }

        // registrado_por SIEMPRE sale del token, nunca del body.
        const registrado_por = id;
        const { lote_id } = req.body;
        const valor_ph = Number(req.body.valor_ph);
        const volumen_litros = Number(req.body.volumen_litros);
        const temperatura =
            req.body.temperatura === undefined ||
            req.body.temperatura === null ||
            req.body.temperatura === ''
                ? null
                : Number(req.body.temperatura);

        if (!lote_id) {
            return res.status(400).json({ error: 'El lote es obligatorio' });
        }
        if (!Number.isFinite(valor_ph) || valor_ph < 0 || valor_ph > 14) {
            return res.status(400).json({ error: 'El pH debe ser un número entre 0 y 14' });
        }
        if (!Number.isFinite(volumen_litros) || volumen_litros <= 0) {
            return res.status(400).json({ error: 'El volumen debe ser un número mayor a 0' });
        }
        if (temperatura !== null && !Number.isFinite(temperatura)) {
            return res.status(400).json({ error: 'La temperatura debe ser un número' });
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

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
