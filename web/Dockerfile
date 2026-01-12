FROM oven/bun:1.1.38

WORKDIR /app

# Link para compatibilidade com Node
RUN ln -s $(which bun) /usr/bin/node

# Instalar dependências
COPY package.json bun.lockb* ./
RUN bun install

# Copiar código
COPY . .

# Build do frontend
RUN bun run build

# Expor porta
EXPOSE 3000

# Servir arquivos estáticos do dist usando Bun HTTP
CMD ["bun", "run", "-e", "import { serve } from 'bun'; serve({ port: 3000, fetch(req){ return new Response(Bun.file('dist' + new URL(req.url).pathname)); } });"]
