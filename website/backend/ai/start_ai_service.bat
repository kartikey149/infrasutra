@echo off
echo ========================================
echo  SIH26122 AI Extraction & Matching Service
echo ========================================
echo.
echo Installing dependencies...
pip install -r requirements.txt
echo.
echo Starting FastAPI service on port 8000...
python extraction_service.py
