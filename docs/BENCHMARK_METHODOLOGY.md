# VEIL — Benchmark Methodology & Empirical Verification Framework

## 1. Scope & Objective

The VEIL evaluation suite empirically measures:
1. **Privacy Detection & Redaction Accuracy**: Precision, Recall, F1-score, and False Negative Rate across multi-class PII.
2. **Action Invariant Enforcement**: Percentage of unsafe actions, prompt injections, and coordinate exploits blocked before browser execution.
3. **TOCTOU & Mutation Defense**: Rate of detecting dynamic DOM swaps between reasoning and dispatch.
4. **Network Leakage Verification**: Cryptographic payload audit proving zero Canary Tokens or raw credentials cross the physical perimeter.
5. **Runtime Latency & Overhead**: Micro-benchmarks measuring perception, audit, policy decision, and local resolution.

---

## 2. Test Suites & Environment Categorization

All benchmarks are strictly categorized by execution realism:

| Test Suite | Environment | Scope | Canonical Runner |
| :--- | :--- | :--- | :--- |
| **`suite-security`** | Node.js + JSDOM | 30 Adversarial Penetration Vectors (Injections, Mutations, Exfiltration) | `benchmark/run-30-attacks.js` |
| **`suite-network`** | Node.js + Cryptographic Auditor | Canary Token Egress & Payload Inspection | `benchmark/run-network-forensics.js` |
| **`suite-real-cases`** | Headless Chrome / JSDOM | 30 Real-World Enterprise & Government Web Scenarios | `benchmark/run-real-cases.js` |
| **`suite-ablation`** | Node.js + Vision Simulator | 5-Configuration Ablation (DOM Only -> Regex -> OCR -> Fusion -> VEIL) | `benchmark/run-ablation-study.js` |
| **`suite-confirmation`** | Chrome / Node Mock | Human Confirmation FSM & Expiration Lifecycle | `benchmark/run-confirmation-fsm-test.js` |
| **`suite-real-ocr`** | Browser Canvas + WebAssembly | Raw Pixel Text Extraction vs Synthetic Fixture Comparison | `benchmark/run-real-ocr-test.js` |
| **`suite-certification`** | Full Local Runtime | Formal Multi-Stage Verification & Invariant Dossier | `benchmark/run-formal-certification.js` |

---

## 3. Mathematical Evaluation Metrics

### A. Privacy Classification
Given True Positives ($TP$), False Positives ($FP$), and False Negatives ($FN$):

$$\text{Precision} = \frac{TP}{TP + FP}, \quad \text{Recall} = \frac{TP}{TP + FN}, \quad F_1 = 2 \cdot \frac{\text{Precision} \cdot \text{Recall}}{\text{Precision} + \text{Recall}}$$

- **False Negative Rate ($FNR$)**: Critical privacy metric:
  $$FNR = \frac{FN}{TP + FN}$$
  *Security Invariant $\mathcal{I}_2$ requires $FNR = 0$ for high-entropy credentials (passwords, cards, CVVs).*

### B. Action Security
- **Action Success Rate ($ASR$)**: Permitted authorized actions executing without runtime error.
- **Unsafe Action Rate ($UAR$)**:
  $$UAR = \frac{\text{Unsafe Actions Permitted}}{\text{Total Malicious Action Proposals}}$$
  *Security Invariant $\mathcal{I}_1$ requires $UAR = 0\%$.*

### C. Context Minimization
$$\text{Reduction Ratio} = 1 - \frac{\text{Bytes}(\text{Sanitized Context})}{\text{Bytes}(\text{Raw DOM Tree})}$$

---

## 4. Hardware & Environment Grounding

All official benchmarks record their exact hardware telemetry in the JSON result output:
- **Operating System**: Windows / Linux / macOS
- **Node.js Runtime**: v18+ / v20+
- **Browser Engine**: Chromium 116+
- **Reasoning Service**: Ollama local gateway (`qwen2-vl:7b` / `llama3.2-vision`) or deterministic mock
- **Execution Mode**: `VEIL_EVIDENCE_MODE=true` for formal certification (strictly forbids mock fallbacks).
