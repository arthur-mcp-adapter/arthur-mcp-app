# ── Stage 1: build frontend ───────────────────────────────────────────────────
FROM node:22-alpine AS frontend-builder
WORKDIR /app
# Vite inlines these at build time; without them the bundle falls back to the
# localhost placeholder in src/supabaseClient.ts and auth breaks silently.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_HCAPTCHA_SITE_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL} \
    VITE_SUPABASE_PUBLISHABLE_KEY=${VITE_SUPABASE_PUBLISHABLE_KEY} \
    VITE_HCAPTCHA_SITE_KEY=${VITE_HCAPTCHA_SITE_KEY}
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: build backend ────────────────────────────────────────────────────
FROM node:22-alpine AS backend-builder
WORKDIR /app
RUN apk add --no-cache python3 make g++
COPY api/package*.json ./
RUN npm ci
COPY api/ .
RUN npm run build && npm prune --omit=dev

# ── Stage 3: runner ───────────────────────────────────────────────────────────
FROM node:22-alpine
ARG GIT_SHA=unknown
ARG VERSION=dev
LABEL org.opencontainers.image.source="https://github.com/arthur-mcp-adapter/arthur-mcp-app" \
      org.opencontainers.image.revision="${GIT_SHA}" \
      org.opencontainers.image.version="${VERSION}"
WORKDIR /app
ENV NODE_ENV=production
RUN mkdir -p /app/data && chown node:node /app/data
# Native modules (sqlite3) are compiled for Alpine in the backend builder stage.
COPY --from=backend-builder /app/node_modules ./node_modules
# Compiled NestJS app, including nest-cli copied assets such as .hbs templates.
COPY --from=backend-builder /app/dist ./dist
# React build served by the backend static middleware from dist/public.
COPY --from=frontend-builder /app/dist ./dist/public

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main"]
