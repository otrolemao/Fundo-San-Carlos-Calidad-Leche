# 🐄 Sistema de Gestión de Calidad de Leche (Sensor de pH) - Fundo San Carlos

## 📋 Descripción del Proyecto
Este repositorio contiene el código fuente y la documentación del Proyecto Integrador de Ingeniería en Informática de INACAP.

El objetivo es desarrollar una **aplicación híbrida** (celular y PC) conectada a un **sensor de pH (Arduino)** para monitorear en tiempo real la acidez de la leche en el Fundo San Carlos (COLUN). Si el pH baja de 6.5 (indicando que la leche se está cortando), el sistema genera una alerta automática y calcula el impacto económico, evitando que el camión de COLUN rechace el lote.

## 🛠️ Tecnologías utilizadas
*   **Hardware:** Arduino + Sensor de pH (BNC)
*   **Backend:** Node.js + Express + PostgreSQL (`pg`), JWT y bcrypt.
*   **Base de Datos:** PostgreSQL (Supabase)
*   **Frontend:** HTML, CSS y JavaScript (Diseño "Terminal War Room").
*   **Gráficos:** Chart.js
*   **Control de versiones:** Git + GitHub

## 📂 Estructura del Repositorio
*   `/backend`: Servidor Node.js, API REST y lógica de seguridad.
*   `/frontend`: Interfaz de usuario (Login, Dashboard y Gráficos).
*   `/database`: Scripts SQL para crear las tablas.
*   `/arduino`: Código del microcontrolador para el sensor de pH.

## 🚀 Cómo ejecutar el proyecto localmente

### Requisitos previos
*   Node.js (v18 o superior)
*   PostgreSQL (o una cuenta en Supabase)
*   Un navegador web moderno

### Pasos
1. Clona el repositorio:
   ```bash
   git clone https://github.com/otrolemao/Fundo-San-Carlos-Calidad-Leche.git
