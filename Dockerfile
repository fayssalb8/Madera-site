# Stage 1: Build frontend
FROM node:22-alpine AS build
WORKDIR /app

# native build tools for better-sqlite3
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN rm -rf node_modules/.vite && npm run build

# Stage 2: Production runtime
FROM node:22-alpine AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3001
ENV DATABASE_PATH=./server/data/madera.db
ENV UPLOADS_DIR=./server/data/uploads

# better-sqlite3 native bindings
COPY package.json package-lock.json* ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ && \
    npm ci --omit=dev && \
    apk del .build-deps && \
    npm cache clean --force

COPY --from=build /app/dist ./dist
COPY server/ ./server/

# Create non-root user and data directory
RUN addgroup -S nodejs && \
    adduser -S nodeapp -G nodejs && \
    mkdir -p /app/server/data && \
    chown -R nodeapp:nodejs /app/server/data

USER nodeapp

EXPOSE 3001

HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3001)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server/index.mjs"]
