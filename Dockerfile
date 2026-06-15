FROM node:20-alpine AS builder
WORKDIR /app

# Copia manifests (root + workspace client) e instala tudo de uma vez
COPY package*.json ./
COPY client/package.json ./client/
RUN npm ci

# Copia o restante e faz o build completo (backend + frontend)
COPY . .
RUN npm run build

FROM node:20-alpine AS production
ENV NODE_ENV=production
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=builder /app/dist ./dist
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "dist/main"]
