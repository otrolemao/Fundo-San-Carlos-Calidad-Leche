-- 1. Borrar tablas anteriores (solo para actualizar la maqueta)
DROP TABLE IF EXISTS auditoria, alertas, liquidaciones_estimadas, tablas_precio, reglas_alerta, muestras_calidad, lotes, usuarios, roles CASCADE;

-- 2. Crear extensión para UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 3. Tabla de Roles
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

-- 4. Tabla de Usuarios (Operadores, Administradores)
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id BIGINT NOT NULL REFERENCES roles(id),
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 5. Tabla de Lotes (Estanques o Camiones de recolección)
CREATE TABLE lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(60) NOT NULL UNIQUE,
    fecha_inicio DATE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. TABLA MODIFICADA: Muestras de Calidad (Ahora con pH)
CREATE TABLE muestras_calidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id UUID NOT NULL REFERENCES lotes(id),
    registrado_por UUID NOT NULL REFERENCES usuarios(id),
    fecha_muestra TIMESTAMP NOT NULL DEFAULT NOW(),
    -- ¡AQUÍ ESTÁ EL CAMBIO! Ahora medimos pH en vez de RCS/UFC
    valor_ph DECIMAL(4,2) NOT NULL CHECK (valor_ph >= 0 AND valor_ph <= 14), 
    temperatura DECIMAL(5,2), -- Dato extra que suelen medir los sensores
    volumen_litros DECIMAL(12,2) NOT NULL CHECK (volumen_litros >= 0),
    observacion VARCHAR(500),
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 7. Tabla de Reglas de Alerta (Para configurar el umbral de pH)
CREATE TABLE reglas_alerta (
    id BIGSERIAL PRIMARY KEY,
    parametro VARCHAR(10) NOT NULL DEFAULT 'PH',
    operador VARCHAR(2) NOT NULL CHECK (operador IN ('<', '<=', '>', '>=')),
    umbral DECIMAL(4,2) NOT NULL CHECK (umbral >= 0 AND umbral <= 14),
    severidad VARCHAR(15) NOT NULL CHECK (severidad IN ('INFO', 'PREVENTIVA', 'CRITICA')),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    creada_en TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8. Tabla de Alertas (Se dispara si el pH baja de 6.5)
CREATE TABLE alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    muestra_id UUID NOT NULL REFERENCES muestras_calidad(id),
    regla_id BIGINT NOT NULL REFERENCES reglas_alerta(id),
    valor_observado DECIMAL(4,2) NOT NULL,
    estado VARCHAR(15) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'REVISADA', 'CERRADA')),
    creada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    revisada_por UUID REFERENCES usuarios(id),
    revisada_en TIMESTAMP
);

-- 9. Tabla de Auditoría (Para ver quién hizo qué)
CREATE TABLE auditoria (
    id BIGSERIAL PRIMARY KEY,
    usuario_id UUID REFERENCES usuarios(id),
    accion VARCHAR(80) NOT NULL,
    entidad VARCHAR(80) NOT NULL,
    entidad_id TEXT,
    fecha TIMESTAMP NOT NULL DEFAULT NOW(),
    resultado VARCHAR(20) NOT NULL,
    detalle JSONB NOT NULL DEFAULT '{}'::jsonb
);

-- 10. Crear Índices para acelerar búsquedas
CREATE INDEX idx_muestras_fecha ON muestras_calidad (fecha_muestra DESC);
CREATE INDEX idx_muestras_ph ON muestras_calidad (valor_ph);
CREATE INDEX idx_alertas_estado ON alertas (estado, creada_en DESC);

-- 11. Insertar Roles Básicos y Regla de pH por defecto
INSERT INTO roles (nombre) VALUES ('ADMINISTRADOR'), ('SUPERVISOR'), ('OPERADOR') ON CONFLICT (nombre) DO NOTHING;

-- Regla por defecto: Si el pH baja de 6.5, es una alerta crítica (Leche cortada)
INSERT INTO reglas_alerta (parametro, operador, umbral, severidad) 
VALUES ('PH', '<', 6.50, 'CRITICA');
