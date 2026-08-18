
# ISAI Laundry Management System

Sistema de gestión para lavandería — Punto de Venta, Inventario y Facturación.

**Universidad de San Carlos de Guatemala — CUNOR**
Ingeniería en Ciencias y Sistemas | Software Avanzado
Óscar Ozziel Yaxcal Leal — 202240349

## Stack tecnológico

| Capa      | Tecnología              | Hosting (plan gratuito) |
|-----------|--------------------------|--------------------------|
| Frontend  | HTML/CSS/JS (o framework a definir) | Vercel |
| Backend   | PHP                       | Render |
| Base de datos | PostgreSQL             | Neon |

## Estructura del proyecto
ISAI-Laundry-Management-System/
├── backend/ # API en PHP (Render)
│ ├── public/ # Punto de entrada (index.php)
│ ├── src/
│ │ ├── Controllers/
│ │ └── Models/
│ └── config/ # Configuración de conexión a base de datos
├── frontend/ # Aplicación cliente (Vercel)
│ ├── src/
│ └── public/
├── database/
│ └── migrations/ # Scripts SQL de creación de tablas
└── docs/ # Documentación del proyecto

## Módulos

- **Punto de Venta (POS):** registro de pedidos, cálculo de cobros, generación de tickets.
- **Inventario:** control de insumos (detergente, bolsas, ganchos, etiquetas).
- **Facturación:** generación de comprobantes y consulta de historial.

## Estado del proyecto

En desarrollo — Semana 1: Análisis de requisitos y diseño de base de datos.