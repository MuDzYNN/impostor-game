FROM node:24-alpine AS base
RUN apk add --no-cache libc6-compat openssl && corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/game/package.json packages/game/
RUN pnpm install --frozen-lockfile --ignore-scripts

# Full source and dev deps, runs migrations and the seed against the db
FROM deps AS tools
COPY . .
RUN pnpm --filter @impostor/game build && pnpm --filter api exec prisma generate
WORKDIR /app/apps/api
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && pnpm exec prisma db seed"]

FROM tools AS build
WORKDIR /app
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_TELEMETRY_DISABLED=1
RUN pnpm --filter api build && pnpm --filter web build

FROM postgres:18-alpine AS backup
RUN apk add --no-cache age rclone && install -d -o postgres /backups
COPY --chmod=755 scripts/backup.sh /usr/local/bin/backup.sh
USER postgres
ENV HOME=/tmp
CMD ["backup.sh"]

# Production deps of api and @impostor/game only
FROM base AS api-deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/game/package.json packages/game/
RUN pnpm install --frozen-lockfile --prod --ignore-scripts --filter api...

FROM node:24-alpine AS api
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production PORT=4000
COPY --from=api-deps --chown=node:node /app ./
COPY --from=build --chown=node:node /app/packages/game/dist ./packages/game/dist
COPY --from=build --chown=node:node /app/apps/api/dist ./apps/api/dist
USER node
WORKDIR /app/apps/api
EXPOSE 4000
CMD ["node", "dist/main.js"]

FROM node:24-alpine AS web
RUN apk add --no-cache libc6-compat
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
COPY --from=build --chown=node:node /app/apps/web/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build --chown=node:node /app/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
CMD ["node", "apps/web/server.js"]
