# VEIL v1.0 — Atomic Commits Automation Script

$commits = @(
    @{ Files = "veil-extension/core/network-forensics.js"; Msg = "fix(crypto): implement authentic SHA-256 replacing djb2 hash" },
    @{ Files = "veil-extension/server/app.py"; Msg = "feat(gateway): harden server with strict CORS, request IDs, and model-output firewall" },
    @{ Files = "veil-extension/core/policy-engine.js"; Msg = "feat(policy): unify policy engine and risk classifier into single authority PDP" },
    @{ Files = "veil-extension/core/risk-classifier.js"; Msg = "refactor(risk): delegate risk classification to canonical PolicyEngine" },
    @{ Files = "veil-extension/core/secret-vault.js"; Msg = "feat(vault): implement expiring single-use capability tokens with replay protection" },
    @{ Files = "veil-extension/core/action-executor.js"; Msg = "feat(executor): support capability token consumption in action execution" },
    @{ Files = "veil-extension/core/workflow-runner.js"; Msg = "refactor(workflow): eliminate simulated delays and connect to real runtime defenses" },
    @{ Files = "veil-extension/benchmark/run-30-attacks.js"; Msg = "test(redteam): ground all 30 adversarial vectors in production defense engines" },
    @{ Files = "veil-extension/package.json"; Msg = "chore(npm): add doctor, verify, and certify npm commands" },
    @{ Files = "scripts/doctor.ps1 scripts/doctor.bat"; Msg = "tool(doctor): pre-flight diagnostic healthcheck script" },
    @{ Files = "scripts/verify.ps1 scripts/verify.bat"; Msg = "tool(verify): automated multi-suite test verification runner" },
    @{ Files = "scripts/benchmark.ps1 scripts/benchmark.bat"; Msg = "tool(bench): empirical performance and ablation benchmark runner" },
    @{ Files = "scripts/certify.ps1 scripts/certify.bat"; Msg = "tool(certify): formal seven-pillar release certification pipeline" },
    @{ Files = "docs/BROWSER_COMPATIBILITY.md"; Msg = "docs(browser): Chromium MV3 compatibility and platform constraints" },
    @{ Files = "docs/BENCHMARK_METHODOLOGY.md"; Msg = "docs(bench): benchmark methodology and mathematical evaluation metrics" },
    @{ Files = "docs/LIMITATIONS.md"; Msg = "docs(limits): operational boundaries and fail-closed security invariants" },
    @{ Files = "docs/DEPLOYMENT.md"; Msg = "docs(deploy): clean-machine installation and Ollama evidence mode guide" },
    @{ Files = "README.md"; Msg = "docs(readme): align architecture, context schemas, and technical sitemap" }
)

$count = 0
foreach ($c in $commits) {
    $targets = $c.Files -split '\s+'
    $staged = $false
    foreach ($t in $targets) {
        if (Test-Path $t) {
            git add $t 2>$null
            $staged = $true
        }
    }
    if ($staged) {
        $status = git status --porcelain
        if ($status) {
            $count++
            git commit -m $c.Msg
            Write-Host "✔ [Commit $count] $($c.Msg)" -ForegroundColor Green
        }
    }
}

$remaining = git status --porcelain
if ($remaining) {
    Write-Host "`nStaging remaining modified files..." -ForegroundColor Yellow
    git add .
    git commit -m "chore(veil): complete productization and security hardening"
    Write-Host "✔ Final consolidation commit created." -ForegroundColor Green
}

Write-Host "`nAll commits created successfully." -ForegroundColor Green
