#!/bin/sh
echo "Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until npx prisma db push --accept-data-loss --skip-generate > /dev/null 2>&1; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "Database not ready after $MAX_RETRIES attempts, exiting."
    exit 1
  fi
  echo "Database unavailable, retrying in 2s ($RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done
echo "Database is ready."
npx prisma generate
npx prisma db push
node prisma/seed.js
exec npx pm2-runtime ecosystem.config.cjs
