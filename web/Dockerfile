FROM oven/bun:1.1.38

WORKDIR /app

# Criar link simbólico do Bun para node (compatível na maioria dos casos)
RUN ln -s $(which bun) /usr/bin/node

COPY package.json bun.lockb* ./
RUN bun install

COPY . .
RUN bun run build

# instalar serve globalmente
RUN bun install -g serve

EXPOSE 3000

CMD ["serve", "-s", "dist"]
