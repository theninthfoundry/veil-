@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo VEIL -- Atomic Commits Batch Runner
echo ============================================================

git add veil-extension/content/redactor.js
git commit -m "fix(redactor): eliminate plaintext secret mirroring in DOM data attribute"

git add veil-extension/core/visual-ocr.js visual-ocr.js veil-extension/content/content.js
git commit -m "feat(ocr): upgrade to dual-path visual OCR v2.1 with on-device TrOCR and vector fallback"

git add veil-extension/core/network-forensics.js
git commit -m "fix(crypto): implement authentic standard SHA-256 replacing djb2 pseudo-hash"

git add veil-extension/server/app.py
git commit -m "feat(gateway): harden FastAPI reasoning server with strict CORS, request IDs, and model-output firewall"

git add veil-extension/core/policy-engine.js veil-extension/core/risk-classifier.js
git commit -m "feat(policy): unify policy engine and risk classifier into single authority PDP"

git add veil-extension/core/secret-vault.js veil-extension/core/action-executor.js
git commit -m "feat(vault): implement expiring single-use capability tokens with replay protection"

git add veil-extension/core/workflow-runner.js
git commit -m "refactor(workflow): ground golden workflows in real runtime defenses without simulated delays"

git add veil-extension/benchmark/run-30-attacks.js
git commit -m "test(redteam): ground all 30 adversarial penetration vectors in real production engines"

git add veil-extension/package.json
git commit -m "chore(npm): add doctor, verify, and certify npm commands to package.json"

git add scripts/doctor.ps1 scripts/doctor.bat
git commit -m "tool(doctor): add pre-flight diagnostic healthcheck scripts"

git add scripts/verify.ps1 scripts/verify.bat
git commit -m "tool(verify): add automated multi-suite test verification scripts"

git add scripts/benchmark.ps1 scripts/benchmark.bat
git commit -m "tool(bench): add empirical performance and ablation benchmark scripts"

git add scripts/certify.ps1 scripts/certify.bat
git commit -m "tool(certify): add formal seven-pillar release certification pipeline scripts"

git add docs/BROWSER_COMPATIBILITY.md
git commit -m "docs(browser): add Chromium MV3 browser compatibility and platform constraints specification"

git add docs/BENCHMARK_METHODOLOGY.md
git commit -m "docs(bench): add benchmark methodology and empirical evaluation metrics specification"

git add docs/LIMITATIONS.md
git commit -m "docs(limits): add operational limitations, platform boundaries, and fail-closed invariants"

git add docs/DEPLOYMENT.md
git commit -m "docs(deploy): add clean-machine installation and Ollama evidence mode deployment guide"

git add README.md
git commit -m "docs(readme): align architecture, context serialization schemas, and technical sitemap"

git add docs/ARCHITECTURE_REALITY_AUDIT.md docs/FINAL_ARCHITECTURE.md docs/TRUST_BOUNDARY.md docs/THREAT_MODEL.md docs/VEIL_TRUTH_MATRIX.md docs/SECURITY_INVARIANTS.md
git commit -m "docs(audit): add forensic reality audit, final architecture, and security invariants"

git add .
git status --porcelain > temp_status.txt
set /p REMAINING=<temp_status.txt
del temp_status.txt
if not "%REMAINING%"=="" (
    git commit -m "chore(veil): complete productization and security kernel consolidation"
)

echo ============================================================
echo All atomic commits executed successfully!
echo ============================================================
pause
