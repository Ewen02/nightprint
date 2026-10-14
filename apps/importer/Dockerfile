# syntax=docker/dockerfile:1
# ---------------------------------------------------------------------------
# nightprint-importer — the API behind nightprint.dev/api
#
# Built in GitHub Actions only, never on the VPS (~/infra/CLAUDE.md § 3.5).
# Context: the repository root (a pnpm monorepo); what it may read is listed in
# Dockerfile.dockerignore, next to this file.
#
# The server is one file, bundled by esbuild with its dependencies: the image
# holds Node and server.mjs, no node_modules, no package manager.
# ---------------------------------------------------------------------------

ARG NODE_VERSION=24.19
ARG ALPINE_VERSION=3.24

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION} AS build
# pnpm's version comes from the packageManager field of the root package.json.
RUN corepack enable || npm install -g pnpm@10.28.0
WORKDIR /repo

# Manifests first: the install layer stays cached until a dependency changes.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/engine/package.json packages/engine/
COPY packages/blueprint/package.json packages/blueprint/
COPY apps/importer/package.json apps/importer/
RUN pnpm install --frozen-lockfile --filter "@nightprint/importer..."

COPY packages/engine/ packages/engine/
COPY packages/blueprint/ packages/blueprint/
COPY apps/importer/ apps/importer/
RUN pnpm --filter @nightprint/importer build

FROM node:${NODE_VERSION}-alpine${ALPINE_VERSION}

# No package manager in the shipped image: nothing to install with, for whoever
# would run code in it. The data volume is created owned by the app's user, so
# a fresh named volume starts writable.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /opt/yarn-* \
 && mkdir -p /data && chown 1001:1001 /data

WORKDIR /app
COPY --from=build /repo/apps/importer/dist/server.mjs ./server.mjs

ENV NODE_ENV=production
ENV PORT=3000
ENV DATA_DIR=/data
USER 1001:1001

# Documentary: no port is published (CLAUDE.md § 3.1); Caddy reaches it on web-nightprint-importer.
EXPOSE 3000
CMD ["node", "server.mjs"]
