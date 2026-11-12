# 🐄 Sistema de Gestión de Calidad de Leche (Sensor de pH) - Fundo San Carlos

## 📋 Descripción del Proyecto
Este repositorio contiene el código fuente y la documentación del Proyecto Integrador de Ingeniería en Informática de INACAP.

El objetivo es desarrollar una **aplicación híbrida** (celular y PC) conectada a un **sensor de pH (Arduino)** para monitorear en tiempo real la acidez de la leche en el Fundo San Carlos (COLUN). Si el pH baja de 6.5 (indicando que la leche se está cortando), el sistema genera una alerta automática para evitar que el camión de COLUN rechace el lote.

## 🛠️ Tecnologías utilizadas
*   **Hardware:** Arduino + Sensor de pH (BNC)
*   **Backend:** Node.js + Express + PostgreSQL (`pg`)
*   **Base de Datos:** PostgreSQL (Supabase)
*   **Frontend:** HTML + CSS + JavaScript (Próximamente React Native para híbrida)
*   **Control de versiones:** Git + GitHub

## 📂 Estructura del Repositorio
*   `/backend`: Servidor Node.js y API REST.
*   `/frontend`: Interfaz de usuario (en desarrollo).
*   `/database`: Scripts SQL para crear las tablas.
*   `/arduino`: Código del microcontrolador.

## 👥 Integrantes del Equipo
*   Jorge Martínez - Backend/Base de Datos
*   Cristóbal Báez - Frontend/UI
*   Joel Tejeda - Integración/QA

## 🚀 Cómo ejecutar el Backend localmente
1. Clona el repositorio.
2. Ve a la carpeta `backend` y ejecuta `npm install`.
3. Crea un archivo `.env` con las credenciales de tu base de datos (ver `.env.example`).
4. Ejecuta `npm run dev`.
