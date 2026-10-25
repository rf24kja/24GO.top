FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY src/ src/
COPY public/ public/
COPY packages/ packages/
RUN mkdir -p /app/data && chown -R node:node /app
USER node
ENV HOST=0.0.0.0 PORT=3000
EXPOSE 3000
CMD ["node","src/server.mjs"]
