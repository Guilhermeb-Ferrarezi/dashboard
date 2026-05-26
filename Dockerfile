FROM oven/bun:1.3.11

WORKDIR /app

COPY api/package.json api/bun.lock ./api/

RUN cd /app/api && bun install
RUN bun install -g @openai/codex

COPY . .

ENV NODE_ENV=production
ENV PORT=4000
ENV CODEX_HOME=/data/codex-home
ENV CODEX_WORKSPACE_ROOT=/app

RUN mkdir -p /data/codex-home

WORKDIR /app/api

EXPOSE 4000

CMD ["bun", "src/server.ts"]
