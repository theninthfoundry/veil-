@echo off
title VEIL v1.0 — 65+ Granular Commit Builder & GitHub Push
echo ===============================================================================
echo   VEIL v1.0 — Generating 65+ Detailed Commits and Pushing to GitHub
echo ===============================================================================
node scripts/commit-history-builder.js
git push origin HEAD
pause
