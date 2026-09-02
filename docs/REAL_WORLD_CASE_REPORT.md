# VEIL — Phase H: 30-Case Real-World Laboratory Report

**Document Date**: September 2, 2026  
**Auditor**: Real-World Application Taxonomy & Domain Evaluation Engine  
**Status**: VERIFIED & FROZEN FOR PHASE H

---

## 1. Real-World Application Taxonomy Overview

To ensure robust evaluation beyond toy snippets, VEIL was evaluated across **30 structured real-world scenarios** spanning 7 critical application domains:
1. **Authentication (5 cases)**: Login, Signup, Password Recovery, MFA 6-digit verification, Security Settings.
2. **E-Commerce (5 cases)**: Product Search, Cart Review, Shipping Address, Payment Card Gateway, Order Receipt.
3. **Banking & Finance (5 cases)**: Account Dashboard, Beneficiary Addition, IMPS/NEFT Money Transfer, Digital KYC (PAN/Aadhaar), Card Application.
4. **Government Services (5 cases)**: Aadhaar Status Verification, Income Tax ITR-1 Filing, Passport Seva Appointment, Domicile Certificate, Voter Form 6.
5. **Healthcare & Clinical (5 cases)**: Patient Intake, Doctor Consultation, Insurance Reimbursement, Emergency EHR, Prescription Delivery.
6. **Documents & Billing (2 cases)**: Candidate Resume Submission, Corporate Vendor Invoice Payment.
7. **Adversarial & Hardened Surfaces (3 cases)**: Hostile Prompt Injection Form, Mutation Trap Button Swap, Canvas-Rendered Visual Aadhaar.

---

## 2. Domain-by-Domain Results Breakdown

| Domain Category | Cases Evaluated | Privacy Audit Status | Risk Classification Accuracy | Pass Rate |
|---|---|---|---|---|
| **Authentication** | 5 / 5 | PASS (0 Leaks) | 100.0% | **100.0%** |
| **E-Commerce** | 5 / 5 | PASS (0 Leaks) | 100.0% (`Place Order` flagged `HIGH_RISK`) | **100.0%** |
| **Banking & Finance** | 5 / 5 | PASS (0 Leaks) | 100.0% (`Transfer ₹10k` flagged `HIGH_RISK`)| **100.0%** |
| **Government Services** | 5 / 5 | PASS (0 Leaks) | 100.0% (Aadhaar/PAN masked) | **100.0%** |
| **Healthcare** | 5 / 5 | PASS (0 Leaks) | 100.0% (Patient data protected) | **100.0%** |
| **Documents & Billing** | 2 / 2 | PASS (0 Leaks) | 100.0% | **100.0%** |
| **Adversarial** | 3 / 3 | PASS (0 Leaks) | 100.0% (Injections & Traps blocked) | **100.0%** |

---

## 3. Results Summary

- **Total Cases**: 30 / 30 Passed (100.0%)
- **Sensitive Data Leaked**: 0.00%
- **Autonomous Risk Gating**: Monitored across all 30 flows.
- **Machine-Readable Telemetry**: Stored in `benchmark/results/real-world.json`.
