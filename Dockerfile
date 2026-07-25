FROM node:22-bookworm-slim AS base
WORKDIR /app

FROM base AS deps
COPY package.json package-lock.json ./
RUN npm ci

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS run
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0
# Own the app files as the unprivileged `node` user that ships with the base image, then drop to it.
# A Next server that reads the DB and writes uploads has no business running as root.
COPY --from=build --chown=node:node /app/public ./public
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
# Uploads live on a mounted volume (llg-uploads -> /app/uploads); it must be writable by `node`.
RUN mkdir -p /app/uploads && chown -R node:node /app/uploads
USER node
EXPOSE 3000
CMD ["node", "server.js"]
