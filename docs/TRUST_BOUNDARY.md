# VEIL — Formal Trust Boundary Specification

**Standard**: Formal Trust Domain & Boundary Architecture  
**Authority**: VEIL Local Security Kernel  
**Date**: September 2, 2026  

---

## 1. The Three Architectural Domains

VEIL defines three strictly separated security domains:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      DOMAIN 1: UNTRUSTED (External)                     │
├─────────────────────────────────────────────────────────────────────────┤
│ • Third-Party Webpages (DOM nodes, scripts, CSS, event handlers)        │
│ • Remote Multimodal Reasoning Models (Ollama, Cloud VLMs)               │
│ • Adversarial Prompt Injections & Dynamic Mutation Traps                │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                        SANITIZED    │    ADVISORY
                        CONTEXT      │    PROPOSALS
                        (Zero Values)│    (Zero Authority)
                                     ▼
═══════════════════════════════════════════════════════════════════════════
                      DOMAIN 2: TRUST TRANSITION GATE
═══════════════════════════════════════════════════════════════════════════
  • VEIL Pre-Flight DLP Firewall (Blocks unmasked secrets & canaries)
  • VEIL Model Output Firewall (Validates schemas, rejects script/coords)
  • VEIL Sensor Fusion Gate (Cross-checks DOM vs Raster pixels)
═══════════════════════════════════════════════════════════════════════════
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                      DOMAIN 3: TRUSTED (Device-Local)                   │
├─────────────────────────────────────────────────────────────────────────┤
│ • VEIL Local Security Kernel                                            │
│ • Policy Decision Point (PolicyEngine)                                  │
│ • In-Memory Capability & Secret Vault (Zero persistence of secrets)     │
│ • Extension-Owned Human Authorization UI (Side Panel / Popup)           │
│ • Pre-Execution TOCTOU Mutation Guard                                   │
│ • Local Action Executor (Synthetic DOM event dispatch)                  │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Inviolable Boundary Rules

1. **Rule of Outbound Flow**: No data may cross from Domain 3 to Domain 1 without passing through the Pre-Flight Privacy Firewall and Context Sanitizer.
2. **Rule of Inbound Flow**: No data may cross from Domain 1 to Domain 3 without passing through the Model Output Firewall (strict Pydantic/JSON schema validation, injection scanning, and semantic capability matching).
3. **Rule of Execution Authority**: Domain 1 can NEVER initiate or directly authorize browser actions. All execution authority is held exclusively in Domain 3.
4. **Rule of Human Supremacy**: High-risk actions identified by the Policy Decision Point must be physically authorized by the user on an extension-owned surface in Domain 3 before execution is unlocked.

---

## 3. Boundary Assertions in Code

Every security-sensitive operation in the kernel must assert authority:

```javascript
assertAuthority(AUTHORITY.PRIVACY);    // Before serialization & dispatch
assertAuthority(AUTHORITY.ACTION);     // Before DOM event dispatch
assertAuthority(AUTHORITY.SECRET);     // Before capability resolution
```

No object originating from the webpage or reasoning model shall possess or be granted these authorities.
