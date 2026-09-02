# ==============================================================================
# VEIL — One-Click Development & Demo Launcher (PowerShell)
# ==============================================================================

Write-Host "==================================================================" -ForegroundColor Cyan
Write-Host "         VEIL: Privacy-Preserving Light-weight Browser Agent       " -ForegroundColor Yellow
Write-Host "     SEE LOCALLY -> SANITIZE LOCALLY -> REASON REMOTELY -> ACT    " -ForegroundColor Cyan
Write-Host "==================================================================" -ForegroundColor Cyan

$RootPath = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RootPath

Write-Host "`n[1/3] Starting FastAPI Reasoning Gateway (Port 8000)..." -ForegroundColor Green
$ServerProcess = Start-Process python -ArgumentList "-m uvicorn app:app --app-dir veil-extension/server --host 127.0.0.1 --port 8000 --reload" -PassThru

Write-Host "[2/3] Starting Static Testbed Server (Port 3000)..." -ForegroundColor Green
$TestbedProcess = Start-Process python -ArgumentList "-m http.server 3000 --directory veil-extension/test-pages" -PassThru

Start-Sleep -Seconds 2

Write-Host "`n[3/3] Ready for Demonstration!" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------" -ForegroundColor Gray
Write-Host "  * Reasoning Gateway:   http://127.0.0.1:8000/docs" -ForegroundColor White
Write-Host "  * Gateway Health:      http://127.0.0.1:8000/health" -ForegroundColor White
Write-Host "  * VEIL Demo Store:     http://127.0.0.1:3000/veil-store.html" -ForegroundColor White
Write-Host "  * Mock Checkout:       http://127.0.0.1:3000/mock-checkout.html" -ForegroundColor White
Write-Host "  * Extension Path:      $RootPath\veil-extension" -ForegroundColor White
Write-Host "------------------------------------------------------------------" -ForegroundColor Gray

Write-Host "`nTo load the extension in Chrome/Edge:" -ForegroundColor Cyan
Write-Host "  1. Navigate to chrome://extensions" -ForegroundColor White
Write-Host "  2. Enable Developer mode (toggle in top right)" -ForegroundColor White
Write-Host "  3. Click 'Load unpacked' and select:" -ForegroundColor White
Write-Host "     $RootPath\veil-extension`n" -ForegroundColor Yellow

# Open the demo store page in default browser
Start-Process "http://127.0.0.1:3000/veil-store.html"

Write-Host "Press Ctrl+C to terminate background servers.`n" -ForegroundColor Gray
Wait-Process -Id $ServerProcess.Id, $TestbedProcess.Id
