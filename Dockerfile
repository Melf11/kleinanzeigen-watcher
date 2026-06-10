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

COPY --from=builder /app/.output ./.output

EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
