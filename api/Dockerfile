FROM oven/bun:1.3.11-alpine

WORKDIR /app
ENV PATH="/root/.bun/bin:${PATH}"

RUN apk add --no-cache curl ripgrep

COPY package.json ./

RUN bun install
RUN bun install -g @openai/codex && command -v codex && codex --version

COPY scripts/bootstrap-codex-home.sh /usr/local/bin/bootstrap-codex-home.sh
COPY codex/AGENTS.md /usr/local/share/codex/AGENTS.md
COPY codex/AGENTS.override.md /usr/local/share/codex/AGENTS.override.md
COPY codex/openapi.yaml /usr/local/share/codex/openapi.yaml

RUN chmod +x /usr/local/bin/bootstrap-codex-home.sh

COPY . .

ENV NODE_ENV=production
ENV PORT=4000
ENV CODEX_HOME=/root/.codex
ENV CODEX_WORKSPACE_ROOT=/app

RUN mkdir -p /root/.codex

EXPOSE 4000

# NOTE: Running as root is required because the Codex agent uses privileged mode
# (sandbox execution, SYS_ADMIN, seccomp=unconfined). Do NOT add a USER directive here.

ENTRYPOINT ["/usr/local/bin/bootstrap-codex-home.sh"]
CMD ["bun", "src/server.ts"]
