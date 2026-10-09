
FROM node:20-alpine

WORKDIR /app/apps/backend

COPY apps/backend/package.json apps/backend/package-lock.json ./
RUN npm install

COPY apps/backend/ ./

RUN npx prisma generate --schema=prisma/schema.prisma

EXPOSE 4000

CMD ["npm", "run", "dev"]
