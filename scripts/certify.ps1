# VEIL — Formal Seven-Pillar Certification Pipeline

Write-Host "===========================================================================" -ForegroundColor Cyan
Write-Host "VEIL — FORMAL SEVEN-PILLAR CERTIFICATION PIPELINE" -ForegroundColor Cyan
Write-Host "North Star: 'VEIL is a local security kernel for AI browser agents.'" -ForegroundColor Gray
Write-Host "===========================================================================" -ForegroundColor Cyan

$extDir = Join-Path $PSScriptRoot "..\veil-extension"
$nodeCmd = "node"

# 1. Environment & Pre-flight Diagnostics
Write-Host "`n[STAGE 1/6] Running System Pre-Flight Diagnostics..." -ForegroundColor Yellow
& (Join-Path $PSScriptRoot "doctor.ps1")

# 2. Security Invariant Verification
Write-Host "`n[STAGE 2/6] Verifying Formal Security Invariants (C1-C7)..." -ForegroundColor Yellow
& $nodeCmd (Join-Path $extDir "benchmark/test-security-invariant.js")
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✖ CERTIFICATION FAILED: Security invariant verification failed." -ForegroundColor Red
    exit 1
}

# 3. 30-Vector Adversarial Red Team Penetration
Write-Host "`n[STAGE 3/6] Executing 30-Vector Adversarial Red Team Penetration..." -ForegroundColor Yellow
& $nodeCmd (Join-Path $extDir "benchmark/run-30-attacks.js")
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✖ CERTIFICATION FAILED: Red team penetration suite failed." -ForegroundColor Red
    exit 1
}

# 4. Wire-Level Network Forensic Proof
Write-Host "`n[STAGE 4/6] Auditing Network Perimeter & Canary Token Egress..." -ForegroundColor Yellow
& $nodeCmd (Join-Path $extDir "benchmark/run-network-forensics.js")
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✖ CERTIFICATION FAILED: Network forensic verification failed." -ForegroundColor Red
    exit 1
}

# 5. Real-World Scenario Suite (30 Cases)
Write-Host "`n[STAGE 5/6] Running 30 Real-World Web Evaluation Cases..." -ForegroundColor Yellow
& $nodeCmd (Join-Path $extDir "benchmark/run-real-cases.js")
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✖ CERTIFICATION FAILED: Real-world scenario suite failed." -ForegroundColor Red
    exit 1
}

# 6. Formal Seven-Pillar Certification & Performance Distributions
Write-Host "`n[STAGE 6/6] Generating Formal Certification Dossier..." -ForegroundColor Yellow
& $nodeCmd (Join-Path $extDir "benchmark/run-formal-certification.js")
if ($LASTEXITCODE -ne 0) {
    Write-Host "`n✖ CERTIFICATION FAILED: Formal certification gate failed." -ForegroundColor Red
    exit 1
}

Write-Host "`n===========================================================================" -ForegroundColor Green
Write-Host "✔ VEIL CERTIFICATION SUCCESSFUL" -ForegroundColor Green
Write-Host "All 7 Security Gates Verified (C1 Privacy, C2 Vault, C3 Authority, C4 Injection," -ForegroundColor Green
Write-Host "C5 TOCTOU Mutation, C6 Network Egress, C7 Fail-Closed)." -ForegroundColor Green
Write-Host "Evidence artifacts generated in veil-extension/benchmark/results/" -ForegroundColor Green
Write-Host "===========================================================================" -ForegroundColor Green

exit 0
