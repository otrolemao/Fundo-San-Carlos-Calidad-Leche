require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

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

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`Servidor corriendo en http://localhost:${PORT}`);
});