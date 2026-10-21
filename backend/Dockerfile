# ---- build: instala dependencias, genera el cliente de Prisma y compila TS ----
FROM node:22-alpine AS builder
WORKDIR /app

# Prisma necesita libssl para sus motores (query/schema engine); alpine no lo trae por defecto.
RUN apk add --no-cache openssl

COPY package.json ./
# --include=dev deja explícito que necesitamos devDependencies (prisma CLI, typescript)
# para generar y compilar, sin depender de que la plataforma de build no las omita.
RUN npm install --include=dev

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime: solo lo necesario para correr el servidor ya compilado ----
FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

RUN apk add --no-cache openssl

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package.json ./

EXPOSE 3001

# Aplica migraciones pendientes y arranca el servidor — seguro de correr en cada inicio.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
