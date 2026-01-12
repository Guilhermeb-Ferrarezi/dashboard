# Usa a imagem oficial do Bun
FROM jarredsumner/bun:latest

# Diretório de trabalho no container
WORKDIR /app

# Copia os arquivos de projeto
COPY . .

# Instala dependências
RUN bun install

# Expõe a porta do servidor
EXPOSE 4000


# Comando para rodar o backend
CMD ["bun", "run", "src/server.ts"]
