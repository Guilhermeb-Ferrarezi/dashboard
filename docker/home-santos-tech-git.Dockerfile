FROM oven/bun:1.3.14-alpine AS base

RUN apk add --no-cache git

WORKDIR /src

ARG SITE_REPO_URL=https://github.com/Guilhermeb-Ferrarezi/Santos-Tech-Home-Page.git

RUN git clone --depth 1 "${SITE_REPO_URL}" /src

RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:1.3.14-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

COPY --from=base /src/dist ./dist
COPY --from=base /src/docker ./docker

EXPOSE 3000

CMD ["bun", "run", "./docker/server.ts"]

