@echo off
setlocal
cd /d %~dp0
if not exist .env copy .env.example .env
call npm install
call npm run db:setup
call npm run db:seed
call npm run dev
