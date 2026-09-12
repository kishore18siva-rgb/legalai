# Dockerfile for LegalLens Full-Stack Application
FROM node:20-alpine AS base
WORKDIR /app

# Backend Build
FROM base AS backend-build
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci
COPY backend/ ./
RUN npx prisma generate
RUN npm run build

# Frontend Build
FROM base AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production Runner
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY --from=backend-build /app/backend/dist ./backend/dist
COPY --from=backend-build /app/backend/prisma ./backend/prisma
COPY --from=frontend-build /app/frontend/dist ./backend/public

EXPOSE 5000

CMD ["node", "backend/dist/index.js"]
