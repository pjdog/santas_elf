FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
COPY public ./public
COPY src ./src
COPY tsconfig.json ./
# Build static assets
RUN npm run build

FROM base AS test
COPY public ./public
COPY src ./src
COPY tsconfig.json ./
CMD ["npm", "test", "--", "--watchAll=false"]

FROM node:20-alpine AS runner
WORKDIR /app

# Lightweight static server
RUN npm install -g serve

COPY --from=builder /app/build ./build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]