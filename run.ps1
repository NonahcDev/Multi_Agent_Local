# run.ps1 -- Start LocalAI Mesh (backend + frontend) on Windows
# Usage: .\run.ps1
# Requires: Python 3.12+, Node.js 18+

$ErrorActionPreference = "Stop"

# ---- Paths ------------------------------------------------------------------
$RootDir     = $PSScriptRoot
$BackendDir  = Join-Path $RootDir "back-end"
$FrontendDir = Join-Path $RootDir "font-end"
$VenvDir     = Join-Path $BackendDir ".venv"
$VenvPython  = Join-Path $VenvDir "Scripts\python.exe"
$VenvPip     = Join-Path $VenvDir "Scripts\pip.exe"

# ---- Log helpers ------------------------------------------------------------
function Write-Step    { param($msg) Write-Host "[MESH]  $msg" -ForegroundColor Cyan    }
function Write-Backend { param($msg) Write-Host "[BACK]  $msg" -ForegroundColor Magenta }
function Write-Front   { param($msg) Write-Host "[FRONT] $msg" -ForegroundColor Cyan    }
function Write-Ok      { param($msg) Write-Host "[ OK ]  $msg" -ForegroundColor Green   }
function Write-Warn    { param($msg) Write-Host "[WARN]  $msg" -ForegroundColor Yellow  }
function Write-Err     { param($msg) Write-Host "[ERR ]  $msg" -ForegroundColor Red     }

# ---- Banner -----------------------------------------------------------------
function Write-Banner {
    Write-Host ""
    Write-Host "  LocalAI Mesh -- Multi-Agent Orchestration Dashboard" -ForegroundColor Cyan
    Write-Host ""
}

# ---- Dependency checks ------------------------------------------------------
function Test-Dependencies {
    Write-Step "Checking dependencies..."

    $python = $null
    foreach ($cmd in @("python", "python3")) {
        try {
            $null = & $cmd --version 2>&1
            if ($LASTEXITCODE -eq 0) { $python = $cmd; break }
        } catch { }
    }
    if (-not $python) {
        Write-Err "Python 3 not found. Install from https://python.org"
        exit 1
    }
    $pyVer = (& $python --version 2>&1).ToString().Trim()
    Write-Ok "$pyVer found"

    try {
        $nodeVer = (node --version 2>&1).ToString().Trim()
        Write-Ok "Node.js $nodeVer"
    } catch {
        Write-Err "Node.js not found. Install from https://nodejs.org"
        exit 1
    }

    try {
        $npmVer = (npm --version 2>&1).ToString().Trim()
        Write-Ok "npm $npmVer"
    } catch {
        Write-Err "npm not found."
        exit 1
    }

    return $python
}

# ---- Backend setup ----------------------------------------------------------
function Initialize-Backend {
    param($PythonCmd)

    Write-Backend "Setting up backend..."

    if (-not (Test-Path $VenvDir)) {
        Write-Backend "Creating virtual environment..."
        & $PythonCmd -m venv $VenvDir
        Write-Ok "Virtual environment created at .venv"
    }

    Write-Backend "Installing Python dependencies..."
    & $VenvPip install -q -r (Join-Path $BackendDir "requirements.txt")
    Write-Ok "Python dependencies ready"

    $envFile    = Join-Path $BackendDir ".env"
    $envExample = Join-Path $BackendDir ".env.example"
    if ((-not (Test-Path $envFile)) -and (Test-Path $envExample)) {
        Copy-Item $envExample $envFile
        Write-Warn ".env created from .env.example -- review settings if needed"
    }
}

# ---- Frontend setup ---------------------------------------------------------
function Initialize-Frontend {
    Write-Front "Setting up frontend..."

    $modules = Join-Path $FrontendDir "node_modules"
    if (-not (Test-Path $modules)) {
        Write-Front "Installing Node.js dependencies (first run may take a while)..."
        Push-Location $FrontendDir
        npm install --silent
        Pop-Location
        Write-Ok "Node.js dependencies installed"
    } else {
        Write-Ok "node_modules present -- skipping install"
    }
}

# ---- Start services in new windows ------------------------------------------
function Start-Services {
    Write-Backend "Starting FastAPI server on http://localhost:8000 ..."
    $backCmd = "Set-Location '$BackendDir'; & '$VenvPython' main.py; Read-Host 'Press Enter to close'"
    $backProc = Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", $backCmd `
        -PassThru -WindowStyle Normal
    Write-Ok "Backend process started (PID $($backProc.Id))"

    Start-Sleep -Seconds 2

    Write-Front "Starting Next.js dev server on http://localhost:3000 ..."
    $frontCmd = "Set-Location '$FrontendDir'; npm run dev; Read-Host 'Press Enter to close'"
    $frontProc = Start-Process powershell `
        -ArgumentList "-NoExit", "-Command", $frontCmd `
        -PassThru -WindowStyle Normal
    Write-Ok "Frontend process started (PID $($frontProc.Id))"

    return $backProc, $frontProc
}

# ---- Wait for backend health ------------------------------------------------
function Wait-Backend {
    Write-Step "Waiting for backend to be ready..."
    $max = 20
    for ($i = 0; $i -lt $max; $i++) {
        try {
            $resp = Invoke-WebRequest -Uri "http://localhost:8000/health" `
                -UseBasicParsing -TimeoutSec 2 -ErrorAction SilentlyContinue
            if ($resp.StatusCode -eq 200) {
                Write-Ok "Backend is ready -- http://localhost:8000"
                return
            }
        } catch { }
        Start-Sleep -Seconds 1
    }
    Write-Warn "Backend did not respond in ${max}s -- check the backend window"
}

# ---- Main -------------------------------------------------------------------
Write-Banner

$pythonCmd = Test-Dependencies
Write-Host ""

Initialize-Backend -PythonCmd $pythonCmd
Initialize-Frontend
Write-Host ""

$procs = Start-Services
Write-Host ""

Wait-Backend

Write-Host ""
Write-Host "+----------------------------------------------+" -ForegroundColor Green
Write-Host "|  LocalAI Mesh is running                     |" -ForegroundColor Green
Write-Host "|                                              |" -ForegroundColor Green
Write-Host "|  Frontend  ->  http://localhost:3000         |" -ForegroundColor Green
Write-Host "|  Backend   ->  http://localhost:8000         |" -ForegroundColor Green
Write-Host "|  API Docs  ->  http://localhost:8000/docs    |" -ForegroundColor Green
Write-Host "|                                              |" -ForegroundColor Green
Write-Host "|  Close the terminal windows to stop          |" -ForegroundColor Green
Write-Host "+----------------------------------------------+" -ForegroundColor Green
Write-Host ""
Write-Host "Waiting for services (Ctrl+C to stop this monitor)..." -ForegroundColor DarkGray

# Keep script alive; stop when both child windows close or user hits Ctrl+C
try {
    while ($true) {
        $allDead = $true
        foreach ($p in $procs) {
            if (-not $p.HasExited) { $allDead = $false; break }
        }
        if ($allDead) { Write-Warn "All services have stopped."; break }
        Start-Sleep -Seconds 3
    }
} finally {
    Write-Step "Cleaning up..."
    foreach ($p in $procs) {
        if (-not $p.HasExited) {
            Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
            Write-Ok "Stopped PID $($p.Id)"
        }
    }
}
