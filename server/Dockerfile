FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependencias primeiro: aproveita o cache de camadas do Docker
COPY package.json ./
RUN npm install --omit=dev --no-audit --no-fund && npm cache clean --force

COPY src ./src
COPY public ./public

# Onde ficam os jogos (montado como volume pelo docker-compose)
RUN mkdir -p /app/jogos /app/tmp
VOLUME ["/app/jogos"]

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/api/saude >/dev/null 2>&1 || exit 1

CMD ["node", "src/server.js"]
