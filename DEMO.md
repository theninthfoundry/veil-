# VEIL v1.0 — SIH Demonstration & Evaluation Guide

**Milestone**: Smart India Hackathon (ISRO Problem Statement)  
**Core Thesis**: *"VEIL gives an AI agent the ability to operate the web without giving the AI ownership of the user's private information."*  
**Deeper Philosophy**: *"VEIL doesn't try to make the AI trustworthy. It makes trust unnecessary at the security boundary."*  
**Live UI URL**: `veil-extension/command-center/command-center.html`

---

## 1. The 60-Second "Aha!" Pitch

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ 1. REAL PAGE                  │ 2. PRIVACY FIREWALL │ 3. AI CONTEXT         │
│ ───────────────────────────── │ ─────────────────── │ ───────────────────── │
│ Name:    Sreeshanth Reddy     │                     │ Name:    [REDACTED]   │
│ Email:   sreeshanth@isro.gov  │    🔒 VEIL ON-DEVICE│ Email:   [REDACTED]   │
│ Card:    4111 2222 3333 4444  │    CANARY FILTER    │ Card:    [REDACTED]   │
│ Order:   Place Order ₹4,999   │                     │ Button:  #submit-btn  │
└─────────────────────────────────────────────────────────────────────────────┘
  Outcome: 0 protected values crossed the AI boundary (4.71 ms local latency).
```

### The 60-Second Script:
> *"Distinguished Evaluators, when traditional AI browser agents help a user check out or file a form, they send raw HTML or desktop screenshots to cloud LLMs—immediately leaking passwords, card numbers, and Aadhaar identities.*
> 
> *VEIL introduces an on-device security layer between the webpage and the AI.*
> 
> *On the left is the live webpage with real credentials. On the right is what the AI receives: a clean structural skeleton with zero sensitive values. The AI can reason about what button to click, but it never sees the user's private data."*

---

## 2. The 5-Minute Deep-Dive Presentation

### Minute 1:00 — The Problem & Invariant
- **Demonstrate**: Open `command-center.html` $\rightarrow$ Point to the **Trust Boundary Architecture Card**.
- **Dialogue**:
  > *"Our core invariant is: **The model can observe sanitized context and propose actions, but it can never directly access protected values or directly execute browser actions.** The AI is an advisory reasoning engine; the local device retains complete execution authority."*

### Minute 2:00 — ValueRef: Zero-Leakage Login
- **Demonstrate**: Switch to **Live Workflows** $\rightarrow$ Select **2. Login** $\rightarrow$ Click **Execute Live Workflow**.
- **Dialogue**:
  > *"How does the AI log in without the password? Traditional agents receive the password string. VEIL provides an abstract token: `valueRef: LOCAL_SECRET_PASS`. The real secret stays inside local browser memory and is injected natively during event dispatch. The password never touches the network."*

### Minute 3:00 — Pixel-Only Canvas Attack
- **Demonstrate**: Open `test-apps/canvas/index.html` or trigger **Pixel Canvas** on the Red Team Radar.
- **Dialogue**:
  > *"What if PII is drawn on an HTML5 `<canvas>` where DOM text doesn't exist? Standard parsers have 0% recall. VEIL’s local Pixel OCR inspects canvas pixel buffers in 2.13 ms, detects the Aadhaar card, and blacks it out on-device."*

### Minute 4:00 — TOCTOU Dynamic Mutation Trap Defense
- **Demonstrate**: Select **5. TOCTOU Trap** in Live Workflows.
- **Dialogue**:
  > *"Here is the critical security test: The agent prepares to click 'Transfer ₹5,000'. The user confirms. While the confirmation modal is open, a malicious script mutates the button to 'Delete Workspace'.*
  > 
  > *VEIL's pre-execution revalidator recalculates semantic overlap right before click dispatch, catches the mismatch, and **immediately aborts**."*

### Minute 5:00 — Wire-Level Network Proof & Conclusion
- **Demonstrate**: Show the **Security Waterfall** and **Egress Telemetry**.
- **Dialogue**:
  > *"We back this with empirical wire-level proof:*
  > - *Local security pipeline latency: **4.71 milliseconds**.*
  > - *Physical network leakage: **0.00% (0 bytes)**.*
  > - *Seven-pillar security certification: **7 / 7 Controls Certified (Fail-Closed: YES)**.*
  > 
  > ***The AI controlled the browser. It never controlled the user's secrets.***  
  > *Thank you. We are ready for your questions."*
