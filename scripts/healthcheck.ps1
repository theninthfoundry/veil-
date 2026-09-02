# VEIL Automated Environment Healthcheck
Write-Host 'Checking VEIL Gateway (Port 8000)...' -ForegroundColor Cyan
try {
    $res = Invoke-RestMethod -Uri 'http://127.0.0.1:8000/health' -TimeoutSec 2
    Write-Host '✔ Gateway Health: OK' -ForegroundColor Green
} catch {
    Write-Host 'ℹ Gateway offline (Run scripts\start-all.ps1 to start)' -ForegroundColor Yellow
}
