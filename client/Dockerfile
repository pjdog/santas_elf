FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY public ./public
COPY src ./src
COPY tsconfig.json ./

# Build static assets
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

# Lightweight static server
RUN npm install -g serve

COPY --from=builder /app/build ./build
ENV NODE_ENV=production
EXPOSE 3000
CMD ["serve", "-s", "build", "-l", "3000"]
