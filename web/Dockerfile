# Imagem oficial do Bun
FROM oven/bun:1.1.38

# Diretório de trabalho dentro do container
WORKDIR /app

# Criar link simbólico para compatibilidade com pacotes que chamam node
RUN ln -s $(which bun) /usr/bin/node

# Copiar dependências e instalar
COPY package.json bun.lockb* ./
RUN bun install

# Copiar todo o projeto
COPY . .

# Build do frontend (Vite)
RUN bun run build

# Instalar serve globalmente para servir os arquivos estáticos
RUN bun install -g serve

# Expor a porta que o servidor vai usar
EXPOSE 3000

CMD ["bun", "expo-static", "dist", "-p", "3000"]

