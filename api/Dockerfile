# Usa a imagem oficial do Bun do Oven
FROM oven/bun:1.1.38


# Copia package.json e bun.lockb para instalar dependências
COPY package.json bun.lock* ./

# Instala dependências via Bun
RUN bun install

# Copia todo o projeto
COPY . .

# Expõe a porta do servidor
EXPOSE 4000


# Comando para rodar o backend
CMD ["bun", "run", "src/server.ts"]
