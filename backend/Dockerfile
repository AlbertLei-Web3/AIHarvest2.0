FROM node:18-alpine as builder

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

# Production image
FROM node:18-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./

RUN npm install --only=production

COPY --from=builder /app ./

EXPOSE 3001

CMD ["npm", "start"] 