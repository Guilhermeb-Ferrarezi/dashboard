# Stage 1: Build com Bun
FROM oven/bun:1.1.38 AS build

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

RUN bun run build

# Stage 2: Servir com Nginx
FROM nginx:alpine

# Copia build estático
COPY --from=build /app/dist /usr/share/nginx/html

# Config Nginx customizada (opcional, SPA)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Mantém Nginx em foreground
CMD ["nginx", "-g", "daemon off;"]
