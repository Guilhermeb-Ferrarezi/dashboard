# Stage 1: Build com Bun
FROM oven/bun:1.1.38 AS build

WORKDIR /app

# Copiar dependências e instalar
COPY package.json bun.lockb* ./
RUN bun install

# Copiar projeto e setar variável de ambiente para build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build do frontend
RUN bun run build

# Stage 2: Nginx para servir frontend
FROM nginx:alpine

# Copiar build final
COPY --from=build /app/dist /usr/share/nginx/html

# Copiar configuração customizada
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta 80
EXPOSE 75

# Manter Nginx rodando em foreground
CMD ["nginx", "-g", "daemon off;"]
