# Stage 1: Build com Bun
FROM oven/bun:1.1.38 AS build

WORKDIR /app

# Copiar dependências e instalar
COPY package.json bun.lockb* ./
RUN bun install

# Copiar o projeto e setar variável de ambiente para o build
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL

# Build do frontend (Vite)
RUN bun run build

# Stage 2: Servir com Nginx
FROM nginx:alpine

# Copiar build final
COPY --from=build /app/dist /usr/share/nginx/html

# Configuração customizada do Nginx para SPA
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expor porta padrão
EXPOSE 3000

# Manter Nginx rodando em foreground
CMD ["nginx", "-g", "daemon off;"]
