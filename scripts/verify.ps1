# VEIL — Core Suite Verification

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "VEIL — Automated Test Suite Verification" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$extDir = Join-Path $PSScriptRoot "..\veil-extension"
$nodeCmd = "node"

$suites = @(
    @{ Name = "Adversarial Invariant Tests"; Script = "benchmark/run-adversarial-attacks.js" },
    @{ Name = "30-Vector Red Team Penetration"; Script = "benchmark/run-30-attacks.js" },
    @{ Name = "Network Forensic Egress Audit"; Script = "benchmark/run-network-forensics.js" },
    @{ Name = "Human Confirmation FSM Suite"; Script = "benchmark/run-confirmation-fsm-test.js" },
    @{ Name = "30 Real-World Web Scenarios"; Script = "benchmark/run-real-cases.js" }
)

$passedCount = 0
$failedCount = 0

foreach ($suite in $suites) {
    Write-Host "`n>>> Running: $($suite.Name)..." -ForegroundColor Yellow
    $scriptPath = Join-Path $extDir $suite.Script
    
    & $nodeCmd $scriptPath
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✔ PASSED: $($suite.Name)" -ForegroundColor Green
        $passedCount++
    } else {
        Write-Host "  ✖ FAILED: $($suite.Name) (ExitCode: $LASTEXITCODE)" -ForegroundColor Red
        $failedCount++
    }
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "VERIFICATION SUMMARY: $passedCount / $($suites.Count) Suites Passed" -ForegroundColor $(if ($failedCount -eq 0) { "Green" } else { "Red" })
Write-Host "============================================================" -ForegroundColor Cyan

if ($failedCount -gt 0) {
    exit 1
} else {
    exit 0
}
