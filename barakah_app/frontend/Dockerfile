# Stage 1: Build React App
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with network retry configuration
RUN npm config set fetch-retries 10 \
 && npm config set fetch-retry-mintimeout 20000 \
 && npm config set fetch-retry-maxtimeout 120000 \
 && npm install --legacy-peer-deps --no-audit

# Copy source files
COPY . .

# Build argument for API URL
ARG REACT_APP_API_BASE_URL=https://api.barakah.cloud
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Build the React app (juga men-trigger prebuild version.json)
RUN npm run build

# Stage 2: Ultra-light Runner (hemat 90% disk VPS, image menyusut dari 1.2GB ke ~120MB)
FROM node:18-alpine

WORKDIR /app

# Install lightweight serve static runner
RUN npm install -g serve

# Copy only the compiled production build
COPY --from=builder /app/build ./build

EXPOSE 3001

CMD ["serve", "-s", "build", "-l", "3001"]

