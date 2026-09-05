# VEIL — Granular Atomic Commits PowerShell Script

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "VEIL — Granular Atomic Commits Runner" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

$commits = @(
    @{ Files = @("veil-extension/content/redactor.js"); Msg = "fix(redactor): eliminate plaintext secret mirroring in DOM data attribute" },
    @{ Files = @("veil-extension/core/visual-ocr.js", "visual-ocr.js", "veil-extension/content/content.js"); Msg = "feat(ocr): upgrade to dual-path visual OCR v2.1 with on-device TrOCR and vector fallback" },
    @{ Files = @("veil-extension/core/network-forensics.js"); Msg = "fix(crypto): implement authentic standard SHA-256 replacing djb2 pseudo-hash" },
    @{ Files = @("veil-extension/server/app.py"); Msg = "feat(gateway): harden FastAPI reasoning server with strict CORS, request IDs, and model-output firewall" },
    @{ Files = @("veil-extension/core/policy-engine.js", "veil-extension/core/risk-classifier.js"); Msg = "feat(policy): unify policy engine and risk classifier into single authority PDP" },
    @{ Files = @("veil-extension/core/secret-vault.js", "veil-extension/core/action-executor.js"); Msg = "feat(vault): implement expiring single-use capability tokens with replay protection" },
    @{ Files = @("veil-extension/core/workflow-runner.js"); Msg = "refactor(workflow): ground golden workflows in real runtime defenses without simulated delays" },
    @{ Files = @("veil-extension/benchmark/run-30-attacks.js"); Msg = "test(redteam): ground all 30 adversarial penetration vectors in real production engines" },
    @{ Files = @("veil-extension/package.json"); Msg = "chore(npm): add doctor, verify, and certify npm commands to package.json" },
    @{ Files = @("scripts/doctor.ps1", "scripts/doctor.bat"); Msg = "tool(doctor): add pre-flight diagnostic healthcheck scripts" },
    @{ Files = @("scripts/verify.ps1", "scripts/verify.bat"); Msg = "tool(verify): add automated multi-suite test verification scripts" },
    @{ Files = @("scripts/benchmark.ps1", "scripts/benchmark.bat"); Msg = "tool(bench): add empirical performance and ablation benchmark scripts" },
    @{ Files = @("scripts/certify.ps1", "scripts/certify.bat"); Msg = "tool(certify): add formal seven-pillar release certification pipeline scripts" },
    @{ Files = @("docs/BROWSER_COMPATIBILITY.md"); Msg = "docs(browser): add Chromium MV3 browser compatibility and platform constraints specification" },
    @{ Files = @("docs/BENCHMARK_METHODOLOGY.md"); Msg = "docs(bench): add benchmark methodology and empirical evaluation metrics specification" },
    @{ Files = @("docs/LIMITATIONS.md"); Msg = "docs(limits): add operational limitations, platform boundaries, and fail-closed invariants" },
    @{ Files = @("docs/DEPLOYMENT.md"); Msg = "docs(deploy): add clean-machine installation and Ollama evidence mode deployment guide" },
    @{ Files = @("README.md"); Msg = "docs(readme): align architecture, context serialization schemas, and technical sitemap" },
    @{ Files = @("docs/ARCHITECTURE_REALITY_AUDIT.md", "docs/FINAL_ARCHITECTURE.md", "docs/TRUST_BOUNDARY.md", "docs/THREAT_MODEL.md", "docs/VEIL_TRUTH_MATRIX.md", "docs/SECURITY_INVARIANTS.md"); Msg = "docs(audit): add forensic reality audit, final architecture, and security invariants" }
)

$commitIndex = 0

foreach ($c in $commits) {
    $existingTargets = @()
    foreach ($f in $c.Files) {
        if (Test-Path $f) {
            $existingTargets += $f
        }
    }

    if ($existingTargets.Count -gt 0) {
        git add $existingTargets 2>$null
        $status = git status --porcelain
        if ($status) {
            $commitIndex++
            git commit -m $c.Msg
            Write-Host "  ✔ [Commit $commitIndex] $($c.Msg)" -ForegroundColor Green
        }
    }
}

$remaining = git status --porcelain
if ($remaining) {
    git add .
    git commit -m "chore(veil): complete productization and security kernel consolidation"
    Write-Host "  ✔ [Final Commit] chore(veil): complete productization and security kernel consolidation" -ForegroundColor Green
}

Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host "All atomic commits completed successfully!" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
