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

ENV NEO4J_AUTH=neo4j/selinux123
ENV NEO4J_dbms_memory_pagecache_size=1G
ENV NEO4J_dbms_memory_heap_initial__size=1G
ENV NEO4J_dbms_memory_heap_max__size=1G

# expose ports
EXPOSE 7474 7473 7687

# health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:7474 || exit 1

# Final stage combining both services
FROM alpine:latest

# Install necessary packages
RUN apk add --no-cache nodejs npm wget

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

# Set up environment variables
ENV NEO4J_AUTH=neo4j/selinux123
ENV NEO4J_dbms_memory_pagecache_size=1G
ENV NEO4J_dbms_memory_heap_initial__size=1G
ENV NEO4J_dbms_memory_heap_max__size=1G
ENV NEO4J_HOME=/var/lib/neo4j
ENV PATH=$NEO4J_HOME/bin:$PATH

# Create necessary directories
RUN mkdir -p /data /logs /plugins

# Expose ports for both services
EXPOSE 3000 7474 7473 7687

# Create startup script
RUN echo '#!/bin/sh\n\
neo4j start &\n\
cd /app/nextjs && npm start\n\
' > /start.sh && chmod +x /start.sh

# Start both services
CMD ["/start.sh"] 