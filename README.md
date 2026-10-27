# ISAI Laundry Management System

Sistema web de gestión para la lavandería ISAI (Cobán, Alta Verapaz): punto de venta, seguimiento de pedidos, caja diaria, facturación, inventario de insumos, reportes y gestión de empleados.

**Universidad de San Carlos de Guatemala — Centro Universitario del Norte (CUNOR)**
Ingeniería en Ciencias y Sistemas | Software Avanzado
Óscar Ozziel Yaxcal Leal — 202240349

## Módulos

| Módulo | Qué hace |
|---|---|
| **Punto de Venta (POS)** | Registra pedidos con varios servicios, notas por prenda, fecha de entrega, anticipo o pago completo, y genera el ticket. |
| **Pedidos** | Seguimiento por estado (recibido, en proceso, listo, entregado, cancelado), cobro de saldos, avisos por WhatsApp, filtros y búsqueda. |
| **Caja** | Apertura con fondo inicial, retiros y gastos, cierre con conteo real y diferencia, historial de cortes. Sin caja abierta no se registran pedidos. |
| **Facturación** | Factura automática por pedido e historial con su estado de pago. |
| **Inventario** | Insumos con stock mínimo, entradas y salidas, conteo físico y descuento automático según los insumos que consume cada servicio. |
| **Servicios** | Catálogo de precios (por libra, por pieza o fijo) y receta de insumos por servicio. |
| **Dashboard** | Indicadores, alertas (atrasados, sin recoger, saldos, stock bajo) y gráficas por periodo. |
| **Reportes** | Exportación a Excel de pedidos, facturación y caja. |
| **Empleados** | Usuarios con rol **admin** (acceso completo) o **empleado** (POS, Pedidos, Facturación y Caja). |

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 19, React Router 7, TypeScript, Vite — SPA servida con nginx |
| Backend | Node.js 22, Express 4, TypeScript, Prisma 5 (ORM y migraciones) |
| Base de datos | PostgreSQL 17 |
| Autenticación | JWT en cookie httpOnly (sesión de 1 hora), contraseñas con bcrypt, permisos por rol |
| Reportes | exceljs |
| Infraestructura | Docker, Dokploy en un VPS de Contabo |

## Arquitectura

```
Navegador (SPA React) ──HTTPS──▶ nginx (frontend)
        │
        └──HTTPS /api + cookie──▶ API Express (backend) ──Prisma──▶ PostgreSQL
```

El backend se organiza por módulo en tres capas: `routes` (rutas y permisos), `controllers` (validación de la petición) y `services` (reglas de negocio y acceso a datos). El negocio opera en hora de Guatemala, y el backend fija `TZ=America/Guatemala` aunque el servidor esté en otra zona.

## Estructura del proyecto

```
ISAI-Laundry-Management-System/
├── backend/
│   ├── prisma/          # schema.prisma, migraciones y seeds
│   ├── src/
│   │   ├── routes/      # rutas por módulo
│   │   ├── controllers/ # validación de peticiones
│   │   ├── services/    # reglas de negocio
│   │   ├── middleware/  # requireAuth, requireRole
│   │   └── lib/         # prisma, JWT/cookie, asyncHandler
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── pages/       # una pantalla por módulo
│   │   ├── components/  # componentes reutilizables
│   │   ├── api.ts       # cliente HTTP y tipos
│   │   └── App.tsx      # rutas y menú por rol
│   ├── Dockerfile
│   └── nginx.conf
├── docs/                # informes de las fases del proyecto
└── docker-compose.yml   # entorno completo con Docker
```

## Instalación local

**Requisitos:** Node.js 22+, pnpm y PostgreSQL 17 (o Docker).

1. Clonar e instalar dependencias:

   ```bash
   git clone https://github.com/O3xxiel/ISAI-Laundry-Management-System.git
   cd ISAI-Laundry-Management-System
   pnpm install
   ```

2. Crear `backend/.env`:

   ```env
   DATABASE_URL="postgresql://isai:isai@localhost:5432/isai_laundry"
   DIRECT_URL="postgresql://isai:isai@localhost:5432/isai_laundry"
   JWT_SECRET="un-secreto-largo-y-aleatorio"
   FRONTEND_URL="http://localhost:5173"
   ```

   El frontend usa `VITE_API_URL` (por defecto `http://localhost:3001`).

3. Crear las tablas y el usuario administrador:

   ```bash
   cd backend
   npx prisma migrate deploy
   npm run prisma:seed        # crea admin / admin123 (cámbiala al entrar)
   npm run prisma:seed-demo   # opcional: datos de demostración
   ```

4. Levantar el backend y el frontend (en dos terminales, desde la raíz):

   ```bash
   pnpm --filter backend dev    # http://localhost:3001
   pnpm --filter frontend dev   # http://localhost:5173
   ```

### Con Docker

```bash
docker compose up --build -d
docker compose exec backend npx tsx prisma/seed.ts
```

El frontend queda en `http://localhost:5173` y el backend en `http://localhost:3001`. Las migraciones se aplican solas al arrancar el backend.

## Despliegue

Producción corre en Dokploy con un contenedor por aplicación, construidos con los `Dockerfile` de `backend/` y `frontend/`. En cada aplicación, **Docker Context Path** es `backend` o `frontend`, **Docker File** es `backend/Dockerfile` o `frontend/Dockerfile`, y **Build Path** va vacío. El backend aplica las migraciones pendientes al arrancar (`prisma migrate deploy`). El frontend recibe la URL pública del backend como argumento de construcción `VITE_API_URL`.

## Documentación

- `docs/`: informes de las fases del proyecto (fase 3; fases 5 y 6: construcción y conversión de datos; fases 7 y 8: implantación y pruebas).
- Manual de usuario y manual técnico, entregados por separado en formato Word.

## Estado del proyecto

En producción. Todos los módulos descritos están implementados y desplegados.
