@echo off
echo ================================================
echo  ARCHITECTURE S2R TOOL - STARTING ALL SERVICES
echo ================================================

echo.
echo [1/2] Starting Backend Server...
start "Backend Server" cmd /k "cd backend && call venv\Scripts\activate.bat && python app.py"

echo Waiting for backend to start...
timeout /t 3 /nobreak >nul

echo.
echo [2/2] Starting Frontend Server...
start "Frontend Server" cmd /k "cd frontend && python -m http.server 8080"

echo.
echo ================================================
echo  ALL SERVICES STARTED!
echo ================================================
echo.
echo  Backend:  http://localhost:5001
echo  Frontend: http://localhost:8080
echo.
echo  Opening browser...
timeout /t 2 /nobreak >nul

start http://localhost:8080

echo.
echo ================================================
echo  Press any key to STOP all services...
echo ================================================
pause >nul

echo.
echo Stopping services...
taskkill /F /FI "WINDOWTITLE eq Backend Server*" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq Frontend Server*" >nul 2>&1

echo Services stopped.
timeout /t 2 /nobreak >nul