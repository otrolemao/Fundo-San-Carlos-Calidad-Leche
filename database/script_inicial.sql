CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    nombre VARCHAR(30) NOT NULL UNIQUE
);

CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rol_id BIGINT NOT NULL REFERENCES roles(id),
    nombre VARCHAR(120) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE lotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo VARCHAR(60) NOT NULL UNIQUE,
    fecha_inicio DATE,
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE muestras_calidad (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lote_id UUID NOT NULL REFERENCES lotes(id),
    registrado_por UUID NOT NULL REFERENCES usuarios(id),
    fecha_muestra TIMESTAMP NOT NULL,
    rcs BIGINT NOT NULL CHECK (rcs >= 0),
    ufc BIGINT NOT NULL CHECK (ufc >= 0),
    volumen_litros NUMERIC(12,2) NOT NULL CHECK (volumen_litros >= 0),
    observacion VARCHAR(500),
    creado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    actualizado_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE reglas_alerta (
    id BIGSERIAL PRIMARY KEY,
    parametro VARCHAR(10) NOT NULL CHECK (parametro IN ('RCS', 'UFC')),
    operador VARCHAR(2) NOT NULL CHECK (operador IN ('>', '>=')),
    umbral NUMERIC(18,2) NOT NULL CHECK (umbral >= 0),
    severidad VARCHAR(15) NOT NULL CHECK (severidad IN ('INFO', 'PREVENTIVA', 'CRITICA')),
    activa BOOLEAN NOT NULL DEFAULT TRUE,
    version INTEGER NOT NULL DEFAULT 1,
    aprobada_por UUID REFERENCES usuarios(id),
    creada_en TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE alertas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    muestra_id UUID NOT NULL REFERENCES muestras_calidad(id),
    regla_id BIGINT NOT NULL REFERENCES reglas_alerta(id),
    valor_observado NUMERIC(18,2) NOT NULL,
    estado VARCHAR(15) NOT NULL DEFAULT 'ABIERTA' CHECK (estado IN ('ABIERTA', 'REVISADA', 'CERRADA')),
    creada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    revisada_por UUID REFERENCES usuarios(id),
    revisada_en TIMESTAMP
);

CREATE TABLE tablas_precio (
    id BIGSERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    vigente_desde DATE NOT NULL,
    vigente_hasta DATE,
    fuente_aprobacion TEXT NOT NULL,
    precio_base_por_litro NUMERIC(12,4) NOT NULL CHECK (precio_base_por_litro >= 0),
    activa BOOLEAN NOT NULL DEFAULT FALSE,
    creada_por UUID REFERENCES usuarios(id),
    creada_en TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (vigente_hasta IS NULL OR vigente_hasta >= vigente_desde)
);

CREATE TABLE liquidaciones_estimadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tabla_precio_id BIGINT NOT NULL REFERENCES tablas_precio(id),
    periodo_desde DATE NOT NULL,
    periodo_hasta DATE NOT NULL,
    litros NUMERIC(14,2) NOT NULL CHECK (litros >= 0),
    precio_estimado_por_litro NUMERIC(12,4) NOT NULL CHECK (precio_estimado_por_litro >= 0),
    total_estimado NUMERIC(16,2) NOT NULL CHECK (total_estimado >= 0),
    calculado_por UUID NOT NULL REFERENCES usuarios(id),
    calculado_en TIMESTAMP NOT NULL DEFAULT NOW(),
    CHECK (periodo_hasta >= periodo_desde)
);

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

CREATE INDEX idx_muestras_fecha ON muestras_calidad (fecha_muestra DESC);
CREATE INDEX idx_muestras_lote_fecha ON muestras_calidad (lote_id, fecha_muestra DESC);
CREATE INDEX idx_alertas_estado_fecha ON alertas (estado, creada_en DESC);
CREATE INDEX idx_auditoria_fecha ON auditoria (fecha DESC);

INSERT INTO roles (nombre) VALUES ('ADMINISTRADOR'), ('SUPERVISOR'), ('OPERADOR') ON CONFLICT (nombre) DO NOTHING;
