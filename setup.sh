#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
[ -f .env ] || cp .env.example .env
npm install
npm run db:setup
npm run db:seed
npm run dev
