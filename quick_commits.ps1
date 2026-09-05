# VEIL v1.0 — 35+ Rapid Atomic Commits Script

$commits = @(
    @{ Files = "veil-extension/manifest.json"; Msg = "feat(manifest): v3 config & permissions" },
    @{ Files = "veil-extension/icons"; Msg = "assets(icons): security shield icons" },
    @{ Files = "veil-extension/background/background.js"; Msg = "feat(bg): service worker & CORS fetch" },
    @{ Files = "veil-extension/core/session.js"; Msg = "feat(session): session lifecycle manager" },
    @{ Files = "veil-extension/core/policy-engine.js"; Msg = "feat(policy): 4-tier action policy engine" },
    @{ Files = "veil-extension/core/dom-utils.js"; Msg = "feat(dom): TreeWalker & shadow DOM parser" },
    @{ Files = "veil-extension/core/detector.js"; Msg = "feat(detector): span-arbitrated PII regex" },
    @{ Files = "veil-extension/core/visual-ocr.js"; Msg = "feat(ocr): on-device pixel OCR v2.1" },
    @{ Files = "visual-ocr.js"; Msg = "refactor(ocr): unified OCR root entrypoint" },
    @{ Files = "veil-extension/core/secret-vault.js"; Msg = "feat(vault): in-memory ValueRef tokens" },
    @{ Files = "veil-extension/core/context-builder.js"; Msg = "feat(context): sanitized structural JSON" },
    @{ Files = "veil-extension/core/privacy-audit.js"; Msg = "feat(audit): pre-flight privacy firewall" },
    @{ Files = "veil-extension/core/risk-classifier.js"; Msg = "feat(risk): financial & action classifier" },
    @{ Files = "veil-extension/core/mutation-guard.js"; Msg = "feat(guard): TOCTOU mutation trap defense" },
    @{ Files = "veil-extension/core/action-resolver.js"; Msg = "feat(resolver): semantic Jaccard resolution" },
    @{ Files = "veil-extension/core/action-executor.js"; Msg = "feat(executor): synthetic event dispatch" },
    @{ Files = "veil-extension/core/security-ledger.js"; Msg = "feat(ledger): session security event log" },
    @{ Files = "veil-extension/core/agent-orchestrator.js"; Msg = "feat(orchestrator): human confirmation FSM" },
    @{ Files = "veil-extension/core/workflow-runner.js"; Msg = "feat(workflow): golden workflows runner" },
    @{ Files = "veil-extension/content/redactor.js"; Msg = "feat(redactor): in-page blackout overlay" },
    @{ Files = "veil-extension/content/inspector-overlay.js"; Msg = "feat(inspector): live tab HUD overlay" },
    @{ Files = "veil-extension/content/vision-fallback.js"; Msg = "feat(vision): face detection biometrics" },
    @{ Files = "veil-extension/content/high-risk-confirmation.js"; Msg = "feat(gate): 1-click confirmation modal" },
    @{ Files = "veil-extension/content/content.js"; Msg = "feat(content): main perception-action loop" },
    @{ Files = "veil-extension/popup"; Msg = "feat(popup): telemetry & control panel" },
    @{ Files = "veil-extension/test-pages/case-001-public-doc.html veil-extension/test-pages/case-002-ecommerce-store.html"; Msg = "test(pages): docs & ecommerce cases" },
    @{ Files = "veil-extension/test-pages/case-003-login-auth.html veil-extension/test-pages/case-004-netbanking.html"; Msg = "test(pages): login & netbanking cases" },
    @{ Files = "veil-extension/test-pages/case-005-govt-ekyc.html veil-extension/test-pages/case-006-healthcare.html"; Msg = "test(pages): ekyc & healthcare cases" },
    @{ Files = "veil-extension/test-pages/case-007-image-pii.html veil-extension/test-pages/case-008-canvas-pii.html"; Msg = "test(pages): image & canvas PII cases" },
    @{ Files = "veil-extension/test-pages/case-009-prompt-injection.html veil-extension/test-pages/case-010-dom-mutation.html"; Msg = "test(pages): injection & mutation cases" },
    @{ Files = "veil-extension/benchmark/run-real-cases.js"; Msg = "test(bench): real-web 10-case evaluation" },
    @{ Files = "veil-extension/benchmark/run-real-ocr-test.js"; Msg = "test(bench): 10-fixture pixel OCR suite" },
    @{ Files = "veil-extension/benchmark/run-vision-test.js"; Msg = "test(bench): 15-fixture visual suite" },
    @{ Files = "veil-extension/benchmark/run-formal-certification.js"; Msg = "test(bench): formal C1-C7 certification" },
    @{ Files = "veil-extension/benchmark/run-confirmation-fsm-test.js"; Msg = "test(bench): confirmation FSM & TOCTOU" },
    @{ Files = "test.js"; Msg = "ci(runner): master zero-trust verification" },
    @{ Files = "docs"; Msg = "docs(audit): certification dossier & truth" },
    @{ Files = "README.md ARCHITECTURE.md INSTALL.md DEMO.md"; Msg = "docs(spec): master product documentation" }
)

$count = 0
foreach ($c in $commits) {
    $targets = $c.Files -split '\s+'
    foreach ($t in $targets) {
        if (Test-Path $t) {
            git add $t 2>$null
        }
    }
    $status = git status --porcelain
    if ($status) {
        $count++
        git commit -m $c.Msg
        Write-Host "✔ [Commit $count] $($c.Msg)" -ForegroundColor Green
    }
}

$remaining = git status --porcelain
if ($remaining) {
    git add -A
    $count++
    git commit -m "chore(release): finalize VEIL v1.0 release candidate"
    Write-Host "✔ [Commit $count] chore(release): finalize VEIL v1.0 release candidate" -ForegroundColor Cyan
}

Write-Host "`n🏆 Completed $count commits!" -ForegroundColor Yellow
Write-Host "To push to GitHub, run: git push origin HEAD"
