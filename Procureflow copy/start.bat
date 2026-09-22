@echo off
title Procureflow - SIH 2026

echo.
echo  ============================================================
echo   Procureflow - SIH 2026
echo   Reduce Waiting. Improve Transparency. Simplify Procurement.
echo  ============================================================
echo.

:: ─── Check Python ────────────────────────────────────────────
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.10+
    echo         Download: https://www.python.org/downloads/
    pause
    exit /b 1
)

:: ─── Check Node ──────────────────────────────────────────────
node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Please install Node.js 18+
    echo         Download: https://nodejs.org/
    pause
    exit /b 1
)

echo [1/5] Checking Python dependencies...
cd /d "%~dp0backend"
pip install -r requirements.txt --quiet
if errorlevel 1 (
    echo [ERROR] Failed to install Python dependencies.
    pause
    exit /b 1
)

echo [2/5] Initialising database and seeding demo data...
python init_db.py
if errorlevel 1 (
    echo [ERROR] Database initialisation failed.
    pause
    exit /b 1
)

echo [3/5] Starting FastAPI backend on http://localhost:8000 ...
start "Procureflow Backend" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"

echo [4/5] Installing frontend dependencies (first run may take a minute)...
cd /d "%~dp0frontend"
if not exist node_modules (
    npm install --silent
    if errorlevel 1 (
        echo [ERROR] npm install failed.
        pause
        exit /b 1
    )
)

echo [5/5] Starting Vite frontend on http://localhost:5173 ...
start "Procureflow Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo.
echo  ============================================================
echo   Procureflow is starting!
echo.
echo   Farmer Portal  :  http://localhost:5173/login/farmer
echo   Staff Portal   :  http://localhost:5173/login/staff
echo   Backend API    :  http://localhost:8000
echo   API Docs       :  http://localhost:8000/docs
echo.
echo   Demo Accounts:
echo     Farmer   :  farmer@demo.com   /  farmer123
echo     Operator :  operator@demo.com /  operator123
echo     Officer  :  officer@demo.com  /  officer123
echo  ============================================================
echo.
echo  Both server windows will open. Close them to stop the servers.
echo.
pause
