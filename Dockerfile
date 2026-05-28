FROM oven/bun:1.3.11-alpine

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

# NOTE: Running as root is required because the Codex agent uses privileged mode
# (sandbox execution, SYS_ADMIN, seccomp=unconfined). Do NOT add a USER directive here.

CMD ["bun", "src/server.ts"]
