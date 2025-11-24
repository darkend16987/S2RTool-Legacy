@echo off
echo ================================================
echo STARTING FRONTEND SERVER
echo ================================================

echo.
echo Starting Python HTTP Server on port 8080...
echo.
echo Frontend available at: http://localhost:8080
echo.
echo Press Ctrl+C to stop the server
echo.
python -m http.server 8080

pause