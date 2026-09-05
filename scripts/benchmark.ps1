# VEIL — Empirical Performance & Ablation Benchmark Runner

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "VEIL — Empirical Benchmarks & Ablation Profiler" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$extDir = Join-Path $PSScriptRoot "..\veil-extension"
$nodeCmd = "node"

$benchmarks = @(
    @{ Name = "5-Configuration Ablation Study"; Script = "benchmark/run-ablation-study.js" },
    @{ Name = "Latency & Memory Profiler"; Script = "benchmark/run-performance-profiler.js" },
    @{ Name = "Visual OCR Accuracy Benchmark"; Script = "benchmark/run-real-ocr-test.js" },
    @{ Name = "Full Accuracy Benchmark"; Script = "benchmark/run-benchmark.js" }
)

foreach ($bm in $benchmarks) {
    Write-Host "`n>>> Running: $($bm.Name)..." -ForegroundColor Yellow
    $scriptPath = Join-Path $extDir $bm.Script
    & $nodeCmd $scriptPath
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "Benchmark artifacts written to veil-extension/benchmark/results/" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
