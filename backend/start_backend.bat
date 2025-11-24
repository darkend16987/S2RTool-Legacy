@echo off
echo ================================================
echo STARTING BACKEND SERVER
echo ================================================

echo.
echo Activating virtual environment...
call venv\Scripts\activate.bat

echo.
echo Checking .env file...
if not exist .env (
    echo ERROR: .env file not found!
    echo Please create .env file with GEMINI_API_KEY
    pause
    exit /b 1
)

echo.
echo Starting Flask server...
echo Backend will be available at: http://localhost:5001
echo Health check: http://localhost:5001/health
echo.
python app.py

pause