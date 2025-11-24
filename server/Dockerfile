FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build

FROM node:20-alpine AS test
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./tsconfig.json
COPY src ./src

# Default test command; can be overridden by docker-compose
CMD ["npm", "test", "--", "--runInBand", "--watch=false"]

FROM node:20-alpine AS runner
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist
ENV NODE_ENV=production
EXPOSE 5000

# Create data directory and set permissions
RUN mkdir -p /app/data && chown -R node:node /app/data

USER node
CMD ["node", "dist/index.js"]
