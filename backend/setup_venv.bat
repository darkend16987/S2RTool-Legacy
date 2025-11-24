@echo off
echo ================================================
echo SETUP VIRTUAL ENVIRONMENT
echo ================================================

echo.
echo [1/3] Creating virtual environment...
python -m venv venv

echo.
echo [2/3] Activating venv...
call venv\Scripts\activate.bat

echo.
echo [3/3] Installing dependencies...
pip install --upgrade pip
pip install -r requirements.txt

echo.
echo ================================================
echo SETUP COMPLETE!
echo ================================================
echo.
echo Next steps:
echo 1. Create .env file with your GEMINI_API_KEY
echo 2. Run: start_backend.bat
echo.
pause