# ---- build: compila la SPA con Vite ----
FROM node:22-alpine AS builder
WORKDIR /app

COPY package.json ./
# --include=dev deja explícito que necesitamos devDependencies (vite, typescript)
# para compilar, sin depender de que la plataforma de build no las omita.
RUN npm install --include=dev

COPY . .

# Se hornea en el bundle estático; debe ser una URL alcanzable desde el navegador del
# usuario, no desde dentro de la red de Docker (por eso no es "http://backend:3001").
ARG VITE_API_URL=http://localhost:3001
ENV VITE_API_URL=$VITE_API_URL

RUN npm run build

# ---- runtime: sirve los archivos estáticos con nginx ----
FROM nginx:alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
