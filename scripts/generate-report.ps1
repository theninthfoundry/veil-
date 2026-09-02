# VEIL Automated Benchmark Report Generator
Write-Host 'Generating VEIL Benchmark Summary...' -ForegroundColor Cyan
Set-Location "$PSScriptRoot/../veil-extension"
node benchmark/run-all-tests.js
Write-Host '✔ Benchmark report generated.' -ForegroundColor Green
