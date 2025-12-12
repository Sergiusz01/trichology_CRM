# Multi-stage build dla optymalizacji rozmiaru obrazu

# Stage 1: Build
FROM node:18-alpine AS builder

WORKDIR /app

# Kopiuj pliki package
COPY package*.json ./
COPY prisma ./prisma/

# Zainstaluj zależności
RUN npm ci

# Kopiuj kod źródłowy
COPY . .

# Wygeneruj Prisma Client
RUN npx prisma generate

# Zbuduj aplikację
RUN npm run build

# Stage 2: Production
FROM node:18-alpine

WORKDIR /app

# Zainstaluj tylko production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Skopiuj zbudowaną aplikację
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

# Utwórz katalogi storage
RUN mkdir -p storage/uploads storage/pdfs storage/email-attachments

# Użytkownik non-root dla bezpieczeństwa
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    chown -R nodejs:nodejs /app

USER nodejs

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

CMD ["node", "dist/index.js"]









