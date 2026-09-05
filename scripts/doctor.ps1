# VEIL — System Pre-Flight Diagnostics (Doctor)

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "VEIL — Pre-Flight System Diagnostics (Doctor)" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$allOk = $true

# 1. Check Node.js
Write-Host "`n[1/6] Checking Node.js runtime..." -NoNewline
try {
    $nodeVer = node --version
    Write-Host " OK ($nodeVer)" -ForegroundColor Green
} catch {
    Write-Host " MISSING" -ForegroundColor Red
    Write-Host "  -> Node.js v18+ is required to run benchmarks and build extension." -ForegroundColor Yellow
    $allOk = $false
}

# 2. Check Python
Write-Host "[2/6] Checking Python runtime..." -NoNewline
try {
    $pyVer = python --version
    Write-Host " OK ($pyVer)" -ForegroundColor Green
} catch {
    Write-Host " MISSING" -ForegroundColor Red
    Write-Host "  -> Python 3.10+ is required to run the local FastAPI reasoning server." -ForegroundColor Yellow
    $allOk = $false
}

# 3. Check Extension Manifest & Core Modules
Write-Host "[3/6] Checking VEIL Extension structure..." -NoNewline
$manifestPath = Join-Path $PSScriptRoot "..\veil-extension\manifest.json"
$coreDir = Join-Path $PSScriptRoot "..\veil-extension\core"
if ((Test-Path $manifestPath) -and (Test-Path $coreDir)) {
    Write-Host " OK (Manifest V3 + Core Modules present)" -ForegroundColor Green
} else {
    Write-Host " INCOMPLETE" -ForegroundColor Red
    Write-Host "  -> manifest.json or core/ modules missing in veil-extension directory." -ForegroundColor Yellow
    $allOk = $false
}

# 4. Check Node Modules
Write-Host "[4/6] Checking Extension dependencies..." -NoNewline
$nodeModules = Join-Path $PSScriptRoot "..\veil-extension\node_modules"
if (Test-Path $nodeModules) {
    Write-Host " OK (node_modules installed)" -ForegroundColor Green
} else {
    Write-Host " WARNING (node_modules missing)" -ForegroundColor Yellow
    Write-Host "  -> Run 'cd veil-extension; npm install' before running benchmarks." -ForegroundColor Yellow
}

# 5. Check Local Gateway Server Port (8000)
Write-Host "[5/6] Probing Local Gateway (http://127.0.0.1:8000/health)..." -NoNewline
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:8000/health" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host " ONLINE" -ForegroundColor Green
    Write-Host "       Reasoner: $($res.reasoner.name) (EvidenceMode: $($res.evidenceMode))" -ForegroundColor Gray
} catch {
    Write-Host " OFFLINE (Gateway not running on port 8000)" -ForegroundColor Yellow
    Write-Host "       -> Start with: cd veil-extension/server; uvicorn app:app --port 8000" -ForegroundColor Gray
}

# 6. Check Local Ollama Daemon (11434)
Write-Host "[6/6] Probing Local Ollama Daemon (http://127.0.0.1:11434/api/tags)..." -NoNewline
try {
    $ollamaRes = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
    $modelCount = if ($ollamaRes.models) { $ollamaRes.models.Count } else { 0 }
    Write-Host " ONLINE ($modelCount models detected)" -ForegroundColor Green
} catch {
    Write-Host " OFFLINE (Ollama not running on port 11434)" -ForegroundColor Yellow
    Write-Host "       -> Required for VEIL_EVIDENCE_MODE=true. Start with: ollama serve" -ForegroundColor Gray
}

Write-Host "`n============================================================" -ForegroundColor Cyan
if ($allOk) {
    Write-Host "STATUS: Host environment is ready for VEIL operations." -ForegroundColor Green
} else {
    Write-Host "STATUS: Some required tools are missing. See recommendations above." -ForegroundColor Yellow
}
Write-Host "============================================================" -ForegroundColor Cyan
