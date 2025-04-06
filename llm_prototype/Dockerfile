# Build stage for Next.js app
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Build the Next.js app
RUN npm run build

# Production stage for Next.js app
FROM node:20-alpine AS nextjs

WORKDIR /app

# Copy built assets from builder
COPY --from=builder /app/next.config.ts ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

# Neo4j stage
FROM neo4j:latest AS neo4j

# Configure Neo4j to listen on all interfaces
ENV NEO4J_AUTH=neo4j/selinux123
ENV NEO4J_dbms_memory_pagecache_size=1G
ENV NEO4J_dbms_memory_heap_initial__size=1G
ENV NEO4J_dbms_memory_heap_max__size=1G
ENV NEO4J_server_default__listen__address=0.0.0.0
ENV NEO4J_server_bolt_advertised__address=0.0.0.0:7687
ENV NEO4J_server_http_advertised__address=0.0.0.0:7474
ENV NEO4J_server_bolt_listen__address=0.0.0.0:7687
ENV NEO4J_server_http_listen__address=0.0.0.0:7474
ENV NEO4J_server_https_listen__address=0.0.0.0:7473

# expose ports
EXPOSE 7474 7473 7687

# health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7474 || exit 1

# Final stage combining both services
FROM alpine:latest

# Install necessary packages
RUN apk add --no-cache nodejs npm wget bash openjdk11-jre curl

# Set environment variables for Next.js
ENV HOST=0.0.0.0
ENV PORT=10000
ENV HOSTNAME=0.0.0.0

# Copy Next.js app
COPY --from=nextjs /app /app/nextjs

# Copy Neo4j
COPY --from=neo4j /var/lib/neo4j /var/lib/neo4j
COPY --from=neo4j /var/lib/neo4j/bin /usr/local/bin/neo4j
COPY --from=neo4j /var/lib/neo4j/lib /usr/local/lib/neo4j
COPY --from=neo4j /var/lib/neo4j/conf /etc/neo4j
COPY --from=neo4j /var/lib/neo4j/data /data
COPY --from=neo4j /var/lib/neo4j/logs /logs
COPY --from=neo4j /var/lib/neo4j/plugins /plugins

# Set up environment variables for Neo4j
ENV NEO4J_AUTH=neo4j/selinux123
ENV NEO4J_dbms_memory_pagecache_size=1G
ENV NEO4J_dbms_memory_heap_initial__size=1G
ENV NEO4J_dbms_memory_heap_max__size=1G
ENV NEO4J_HOME=/var/lib/neo4j
ENV PATH=$NEO4J_HOME/bin:$PATH
ENV NEO4J_server_default__listen__address=0.0.0.0
ENV NEO4J_server_bolt_advertised__address=0.0.0.0:7687
ENV NEO4J_server_http_advertised__address=0.0.0.0:7474
ENV NEO4J_server_bolt_listen__address=0.0.0.0:7687
ENV NEO4J_server_http_listen__address=0.0.0.0:7474
ENV NEO4J_server_https_listen__address=0.0.0.0:7473

# Create necessary directories
RUN mkdir -p /data /logs /plugins

# Expose ports for both services
EXPOSE 10000 7474 7473 7687

# Create startup script
RUN echo '#!/bin/bash\n\
\n\
# Function to log messages with timestamps\n\
log() {\n\
    echo "[$(date "+%Y-%m-%d %H:%M:%S")] $1"\n\
}\n\
\n\
# Start Neo4j\n\
log "Starting Neo4j..."\n\
neo4j start\n\
\n\
# Wait for Neo4j to be ready (with timeout)\n\
log "Waiting for Neo4j to start (timeout: 120s)..."\n\
TIMEOUT=120\n\
COUNTER=0\n\
while ! curl -s http://0.0.0.0:7474 > /dev/null; do\n\
    if [ $COUNTER -gt $TIMEOUT ]; then\n\
        log "ERROR: Neo4j failed to start within $TIMEOUT seconds"\n\
        # Start Next.js anyway\n\
        break\n\
    fi\n\
    let COUNTER=COUNTER+1\n\
    sleep 1\n\
done\n\
\n\
if [ $COUNTER -le $TIMEOUT ]; then\n\
    log "Neo4j is ready!"\n\
fi\n\
\n\
# Start Next.js\n\
log "Starting Next.js..."\n\
cd /app/nextjs && NODE_ENV=production HOST=0.0.0.0 HOSTNAME=0.0.0.0 npm start -- -H 0.0.0.0\n\
' > /start.sh && chmod +x /start.sh

# Start both services
CMD ["/bin/bash", "/start.sh"] 