#!/bin/sh
npx prisma generate
npx prisma db push
node prisma/seed.js
exec node src/index.js
