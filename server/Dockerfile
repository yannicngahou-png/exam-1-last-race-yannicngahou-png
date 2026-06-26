FROM node:20-slim

WORKDIR /app

COPY package*.json ./

RUN apt-get update && apt-get install -y python3 make g++ \
    && npm install --build-from-source \
    && apt-get clean

COPY . .

RUN mkdir -p /data

EXPOSE 3001

CMD ["node", "index.js"]