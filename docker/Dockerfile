FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build || true

# For this demo, we'll run via ts-node in dev mode or compiled in prod
CMD ["npx", "ts-node", "src/index.ts"]
