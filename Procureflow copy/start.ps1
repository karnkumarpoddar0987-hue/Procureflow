#Requires -Version 5.1
<#
.SYNOPSIS
    Starts the Procureflow SIH 2026 prototype.
.DESCRIPTION
    Checks dependencies, initialises the database, seeds demo data,
    then launches the FastAPI backend and Vite frontend in separate windows.
#>

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path

function Write-Banner {
    Write-Host ""
    Write-Host "  ============================================================" -ForegroundColor Cyan
    Write-Host "   Procureflow - SIH 2026" -ForegroundColor Cyan
    Write-Host "   Reduce Waiting. Improve Transparency. Simplify Procurement." -ForegroundColor Gray
    Write-Host "  ============================================================" -ForegroundColor Cyan
    Write-Host ""
}

function Check-Command($name, $installHint) {
    if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
        Write-Host "  [ERROR] '$name' not found. $installHint" -ForegroundColor Red
        exit 1
    }
}

Write-Banner

# ─── Dependency checks ────────────────────────────────────────────────────────
Write-Host "  Checking dependencies..." -ForegroundColor Yellow
Check-Command "python" "Install Python 3.10+ from https://www.python.org/downloads/"
Check-Command "node"   "Install Node.js 18+ from https://nodejs.org/"
Check-Command "npm"    "Install Node.js 18+ from https://nodejs.org/"

$pyVersion = python --version 2>&1
$nodeVersion = node --version 2>&1
Write-Host "  Python  : $pyVersion" -ForegroundColor Green
Write-Host "  Node.js : $nodeVersion" -ForegroundColor Green
Write-Host ""

# ─── Backend setup ────────────────────────────────────────────────────────────
$backendDir  = Join-Path $root "backend"
$frontendDir = Join-Path $root "frontend"

Write-Host "  [1/5] Installing Python dependencies..." -ForegroundColor Yellow
Push-Location $backendDir
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) { Write-Host "  [ERROR] pip install failed." -ForegroundColor Red; exit 1 }
Pop-Location

Write-Host "  [2/5] Initialising database and seeding demo data..." -ForegroundColor Yellow
Push-Location $backendDir
$env:PYTHONIOENCODING = "utf-8"
python init_db.py
if ($LASTEXITCODE -ne 0) { Write-Host "  [ERROR] Database init failed." -ForegroundColor Red; exit 1 }
Pop-Location

# ─── Start backend ────────────────────────────────────────────────────────────
Write-Host "  [3/5] Starting FastAPI backend on http://localhost:8000 ..." -ForegroundColor Yellow
$backendJob = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$backendDir'; `$env:PYTHONIOENCODING='utf-8'; python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
) -PassThru

# ─── Frontend deps ────────────────────────────────────────────────────────────
Write-Host "  [4/5] Checking frontend dependencies..." -ForegroundColor Yellow
Push-Location $frontendDir
if (-not (Test-Path "node_modules")) {
    Write-Host "        Installing npm packages (first run, please wait)..." -ForegroundColor Gray
    npm install --silent
    if ($LASTEXITCODE -ne 0) { Write-Host "  [ERROR] npm install failed." -ForegroundColor Red; exit 1 }
}
Pop-Location

# ─── Start frontend ───────────────────────────────────────────────────────────
Write-Host "  [5/5] Starting Vite frontend on http://localhost:5173 ..." -ForegroundColor Yellow
$frontendJob = Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "Set-Location '$frontendDir'; npm run dev"
) -PassThru

# ─── Wait for backend to be ready ────────────────────────────────────────────
Write-Host ""
Write-Host "  Waiting for backend to start..." -ForegroundColor Gray
$ready = $false
for ($i = 0; $i -lt 20; $i++) {
    Start-Sleep -Seconds 2
    try {
        $resp = Invoke-RestMethod -Uri "http://localhost:8000/api/v1/health" -Method GET -TimeoutSec 3
        if ($resp.status -eq "ok") { $ready = $true; break }
    } catch {}
    Write-Host "    Still starting ($($i*2)s)..." -ForegroundColor Gray
}

Write-Host ""
if ($ready) {
    Write-Host "  ============================================================" -ForegroundColor Green
    Write-Host "   Procureflow is running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "   Farmer Portal  :  http://localhost:5173/login/farmer" -ForegroundColor White
    Write-Host "   Staff Portal   :  http://localhost:5173/login/staff"  -ForegroundColor White
    Write-Host "   Backend API    :  http://localhost:8000"               -ForegroundColor White
    Write-Host "   API Docs       :  http://localhost:8000/docs"          -ForegroundColor White
    Write-Host ""
    Write-Host "   Demo Accounts:" -ForegroundColor Yellow
    Write-Host "     Farmer   :  farmer@demo.com   /  farmer123"
    Write-Host "     Operator :  operator@demo.com /  operator123"
    Write-Host "     Officer  :  officer@demo.com  /  officer123"
    Write-Host "  ============================================================" -ForegroundColor Green
} else {
    Write-Host "  [WARN] Backend health check timed out. Check the backend window for errors." -ForegroundColor Yellow
    Write-Host "         Frontend may still be starting on http://localhost:5173" -ForegroundColor Gray
}

Write-Host ""
Write-Host "  Close the server windows to stop Procureflow." -ForegroundColor Gray
Write-Host "  Press Enter to exit this launcher..." -ForegroundColor Gray
Read-Host
