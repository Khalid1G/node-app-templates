FROM node:v20.14.0-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --omit=dev

COPY . .

ENV PORT=8000

EXPOSE 8000

CMD ["npm", "start"]

