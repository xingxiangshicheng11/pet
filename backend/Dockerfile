FROM --platform=$TARGETPLATFORM node:20-alpine

RUN apk add --no-cache openssl curl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN chmod +x start.sh

RUN npm install -g pm2

EXPOSE 3001

CMD ["sh", "start.sh"]
