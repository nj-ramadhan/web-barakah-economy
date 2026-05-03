FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --production=false

# Copy source files
COPY . .

# Build argument for API URL (set in EasyPanel)
ARG REACT_APP_API_BASE_URL=https://api.barakah.cloud
ENV REACT_APP_API_BASE_URL=$REACT_APP_API_BASE_URL

# Build the React app
RUN npm run build

# Install serve globally for serving the build
RUN npm install -g serve

EXPOSE 3001

CMD ["serve", "-s", "build", "-l", "3001"]
