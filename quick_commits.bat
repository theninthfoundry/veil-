@echo off
setlocal enabledelayedexpansion
title VEIL v1.0 -- Quick 35+ Commits Builder

echo =======================================================================
echo   VEIL v1.0 -- Rapid 35+ Atomic Commits Generator
echo =======================================================================

call :do_commit "veil-extension/manifest.json" "feat(manifest): v3 config & permissions"
call :do_commit "veil-extension/icons" "assets(icons): security shield icons"
call :do_commit "veil-extension/background/background.js" "feat(bg): service worker & CORS fetch"
call :do_commit "veil-extension/core/session.js" "feat(session): session lifecycle manager"
call :do_commit "veil-extension/core/policy-engine.js" "feat(policy): 4-tier action policy engine"
call :do_commit "veil-extension/core/dom-utils.js" "feat(dom): TreeWalker & shadow DOM parser"
call :do_commit "veil-extension/core/detector.js" "feat(detector): span-arbitrated PII regex"
call :do_commit "veil-extension/core/visual-ocr.js" "feat(ocr): on-device pixel OCR v2.1"
call :do_commit "visual-ocr.js" "refactor(ocr): unified OCR root entrypoint"
call :do_commit "veil-extension/core/secret-vault.js" "feat(vault): in-memory ValueRef tokens"
call :do_commit "veil-extension/core/context-builder.js" "feat(context): sanitized structural JSON"
call :do_commit "veil-extension/core/privacy-audit.js" "feat(audit): pre-flight privacy firewall"
call :do_commit "veil-extension/core/risk-classifier.js" "feat(risk): financial & action classifier"
call :do_commit "veil-extension/core/mutation-guard.js" "feat(guard): TOCTOU mutation trap defense"
call :do_commit "veil-extension/core/action-resolver.js" "feat(resolver): semantic Jaccard resolution"
call :do_commit "veil-extension/core/action-executor.js" "feat(executor): synthetic event dispatch"
call :do_commit "veil-extension/core/security-ledger.js" "feat(ledger): session security event log"
call :do_commit "veil-extension/core/agent-orchestrator.js" "feat(orchestrator): human confirmation FSM"
call :do_commit "veil-extension/core/workflow-runner.js" "feat(workflow): golden workflows runner"
call :do_commit "veil-extension/content/redactor.js" "feat(redactor): in-page blackout overlay"
call :do_commit "veil-extension/content/inspector-overlay.js" "feat(inspector): live tab HUD overlay"
call :do_commit "veil-extension/content/vision-fallback.js" "feat(vision): face detection biometrics"
call :do_commit "veil-extension/content/high-risk-confirmation.js" "feat(gate): 1-click confirmation modal"
call :do_commit "veil-extension/content/content.js" "feat(content): main perception-action loop"
call :do_commit "veil-extension/popup" "feat(popup): telemetry & control panel"
call :do_commit "veil-extension/test-pages/case-001-public-doc.html veil-extension/test-pages/case-002-ecommerce-store.html" "test(pages): docs & ecommerce cases"
call :do_commit "veil-extension/test-pages/case-003-login-auth.html veil-extension/test-pages/case-004-netbanking.html" "test(pages): login & netbanking cases"
call :do_commit "veil-extension/test-pages/case-005-govt-ekyc.html veil-extension/test-pages/case-006-healthcare.html" "test(pages): ekyc & healthcare cases"
call :do_commit "veil-extension/test-pages/case-007-image-pii.html veil-extension/test-pages/case-008-canvas-pii.html" "test(pages): image & canvas PII cases"
call :do_commit "veil-extension/test-pages/case-009-prompt-injection.html veil-extension/test-pages/case-010-dom-mutation.html" "test(pages): injection & mutation cases"
call :do_commit "veil-extension/benchmark/run-real-cases.js" "test(bench): real-web 10-case evaluation"
call :do_commit "veil-extension/benchmark/run-real-ocr-test.js" "test(bench): 10-fixture pixel OCR suite"
call :do_commit "veil-extension/benchmark/run-vision-test.js" "test(bench): 15-fixture visual suite"
call :do_commit "veil-extension/benchmark/run-formal-certification.js" "test(bench): formal C1-C7 certification"
call :do_commit "veil-extension/benchmark/run-confirmation-fsm-test.js" "test(bench): confirmation FSM & TOCTOU"
call :do_commit "test.js" "ci(runner): master zero-trust verification"
call :do_commit "docs" "docs(audit): certification dossier & truth"
call :do_commit "README.md ARCHITECTURE.md INSTALL.md DEMO.md" "docs(spec): master product documentation"

:: Stage any remaining files
git status --porcelain > temp_git_status.txt
set /p REMAINING=<temp_git_status.txt
del temp_git_status.txt
if defined REMAINING (
    git add -A
    git commit -m "chore(release): finalize VEIL v1.0 release candidate"
    echo [Commit] chore(release): finalize VEIL v1.0 release candidate
)

echo.
echo =======================================================================
echo   Done! 35+ Commits Created.
echo   To push to GitHub, run: git push origin HEAD
echo =======================================================================
pause
exit /b 0

:do_commit
git add %~1 2>nul
git status --porcelain | findstr /R "." >nul
if !errorlevel! equ 0 (
    git commit -m %~2
    echo [Commit] %~2
)
exit /b 0
