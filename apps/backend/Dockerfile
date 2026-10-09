
FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm install

COPY . .

RUN npx prisma@6.19.0 generate --schema=prisma/schema.prisma

EXPOSE 4000

CMD ["npm", "run", "dev"]
