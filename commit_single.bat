@echo off
setlocal enabledelayedexpansion

echo ============================================================
echo Staging all changes and creating single consolidated commit...
echo ============================================================

git add .
git commit -m "feat(veil): complete productization, security kernel consolidation and forensic hardening" -m "- P0 Security: Eliminate DOM attribute secret mirroring in redactor.js (WeakMap memory isolation)" -m "- Cryptography: Implement standard SHA-256 replacing 32-bit djb2 pseudo-hash in network-forensics.js" -m "- Server Gateway: Restrict CORS to extension origins, enforce extra=forbid, add request IDs and model-output firewall" -m "- Policy Engine: Unify risk classification and declarative policy into single authority Policy Decision Point" -m "- Secret Vault: Implement expiring single-use capability tokens with strict replay invalidation" -m "- Workflow Runner: Ground golden workflows in real runtime defenses without simulated delays" -m "- Red Team: Ground all 30 adversarial penetration attack vectors into live production defense paths" -m "- Tooling: Add pre-flight doctor, verify, benchmark, and certify automation scripts" -m "- Specifications: Add browser compatibility, benchmark methodology, limitations, deployment, and audit specs" -m "- Documentation: Align README context serialization schemas, diagrams, and technical sitemap"

echo ============================================================
echo All changes committed in one single commit!
echo ============================================================
pause
