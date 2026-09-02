@echo off
title VEIL — Launcher
echo ==================================================================
echo          VEIL: Privacy-Preserving Light-weight Browser Agent
echo      SEE LOCALLY -^> SANITIZE LOCALLY -^> REASON REMOTELY -^> ACT
echo ==================================================================

cd /d "%~dp0\.."

echo.
echo [1/2] Starting FastAPI Reasoning Gateway (Port 8000)...
start "VEIL Reasoning Gateway" cmd /k "python -m uvicorn app:app --app-dir veil-extension/server --host 127.0.0.1 --port 8000 --reload"

echo [2/2] Starting Static Testbed Server (Port 3000)...
start "VEIL Testbed Server" cmd /k "python -m http.server 3000 --directory veil-extension/test-pages"

timeout /t 2 >nul

echo.
echo Ready!
echo   * Reasoning Gateway: http://127.0.0.1:8000/docs
echo   * VEIL Demo Store:   http://127.0.0.1:3000/veil-store.html
echo   * Mock Checkout:     http://127.0.0.1:3000/mock-checkout.html
echo.
echo To load extension:
echo   1. Open chrome://extensions
echo   2. Enable Developer mode
echo   3. Click 'Load unpacked' and select: %CD%\veil-extension
echo.

start http://127.0.0.1:3000/veil-store.html
