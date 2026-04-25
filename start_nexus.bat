@echo off
echo ================================================
echo  CRISIS RESPONSE SYSTEM — Starting Up
echo ================================================

:: Backend
echo.
echo [1/3] Installing Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet

echo [2/3] Starting Flask backend on port 5000...
start "Crisis Backend" cmd /k "python main.py"

:: Frontend
echo [3/3] Installing and starting React frontend...
cd /d "%~dp0frontend"
call npm install --silent
start "Crisis Frontend" cmd /k "npm run dev"

echo.
echo ================================================
echo  Both servers started!
echo  Backend:  http://localhost:5000
echo  Frontend: http://localhost:5173
echo ================================================
timeout /t 3
start http://localhost:5173
