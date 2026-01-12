# Usando a imagem oficial Bun do Oven
FROM oven/bun:1.1.38

WORKDIR /apps/web

# Copia apenas package.json + bun.lockb para instalar dependências
COPY package.json bun.lock* ./

RUN bun install

# Copia o restante do projeto
COPY . .

# Expõe a porta interna que o EasyPanel vai rotear
EXPOSE 4000

# Comando para rodar o backend
CMD ["bun", "run", "src/server.ts"]
