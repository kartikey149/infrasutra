@echo off
echo ===================================================
echo   SIH26122 Intelligent Data Capture & Schedule Linking
echo ===================================================
echo.
echo [1/3] Starting Python AI & Database Engine (Port 8000)...
start "SIH AI & Database Engine" cmd /k "cd website\backend\ai && python extraction_service.py"
echo.
echo [2/3] Starting Node.js Backend & Telegram Bot (Port 5000)...
start "SIH Telegram Bot & Express Server" cmd /k "cd website\backend && npm run dev"
echo.
echo [3/3] Starting React UI Server (Port 5173)...
start "SIH React Dashboard" cmd /k "cd website\frontend && npm run dev"
echo.
echo ===================================================
echo  All 3 services launched!
echo  - Python AI & SQLite DB:  http://localhost:8000/docs
echo  - Node & Telegram Bot:    http://localhost:5000
echo  - React Frontend UI:      http://localhost:5173
echo ===================================================
