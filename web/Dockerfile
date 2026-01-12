FROM oven/bun:1.1.38

WORKDIR /app

COPY package.json bun.lockb* ./
RUN bun install

COPY . .

# Build do frontend (React ou Vite)
RUN bun run build

# Serve o build com Bun Serve
RUN bun install -g serve

EXPOSE 3000

CMD ["serve", "-s", "build", "-l", "3000"]
