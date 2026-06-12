# --- Build stage ---
FROM node:22-alpine AS builder
WORKDIR /app

# Install deps (skip lifecycle scripts; `nuxt prepare` needs the full source).
COPY package.json package-lock.json* ./
RUN npm install --no-audit --no-fund --ignore-scripts

# Build the Nuxt app into .output
COPY . .
RUN npm run build

# --- Runtime stage ---
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0

# Version metadata (passed by the CI build; defaults are fine for local builds).
ARG APP_VERSION=dev
ARG GIT_SHA=
ARG BUILD_TIME=
ENV NUXT_PUBLIC_APP_VERSION=$APP_VERSION
ENV NUXT_PUBLIC_GIT_SHA=$GIT_SHA
ENV NUXT_PUBLIC_BUILD_TIME=$BUILD_TIME

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
