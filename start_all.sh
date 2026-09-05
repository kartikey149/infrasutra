#!/bin/bash

echo "==================================================="
echo "  SIH26122 Intelligent Data Capture & Schedule Linking"
echo "==================================================="
echo ""

# Function to clean up background processes on script exit (Ctrl+C)
cleanup() {
    echo ""
    echo "Stopping all services..."
    kill $(jobs -p) 2>/dev/null
    exit
}
trap cleanup SIGINT SIGTERM EXIT

echo "[1/3] Starting Python AI & Database Engine (Port 8000)..."
(cd website/backend/ai && python3 extraction_service.py) &

echo "[2/3] Starting Node.js Backend & Telegram Bot (Port 5000)..."
(cd website/backend && npm run dev) &

echo "[3/3] Starting React UI Server (Port 5173)..."
(cd website/frontend && npm run dev) &

echo ""
echo "==================================================="
echo " All 3 services launched!"
echo " - Python AI & SQLite DB:  http://localhost:8000/docs"
echo " - Node & Telegram Bot:    http://localhost:5000"
echo " - React Frontend UI:      http://localhost:5173"
echo "==================================================="
echo "Press Ctrl+C to stop all servers."

# Wait for all background tasks
wait
