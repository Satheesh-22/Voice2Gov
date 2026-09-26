# voice2gov-backend/Dockerfile
FROM node:22-alpine

WORKDIR /app

# Install dependencies first (layer cache)
COPY package.json ./
RUN npm install --omit=dev

# Copy source
COPY src/ ./src/

# Create runtime directories
RUN mkdir -p uploads logs

# Non-root user for security
RUN addgroup -S v2g && adduser -S v2g -G v2g
RUN chown -R v2g:v2g /app
USER v2g

EXPOSE 5000
CMD ["node", "src/server.js"]
