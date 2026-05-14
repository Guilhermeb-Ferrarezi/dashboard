FROM oven/bun:1.3.11

WORKDIR /app
ENV PATH="/root/.bun/bin:${PATH}"

COPY package.json bun.lock ./

RUN bun install --frozen-lockfile --production
RUN bun install -g @openai/codex && command -v codex && codex --version

COPY . .

ENV NODE_ENV=production
ENV PORT=4000
ENV CODEX_HOME=/root/.codex
ENV CODEX_WORKSPACE_ROOT=/app

RUN mkdir -p /root/.codex

EXPOSE 4000

CMD ["bun", "src/server.ts"]
