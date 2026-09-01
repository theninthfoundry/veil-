# VEIL — Mapping to India's DPDP Act, 2023

Feature 5 from the PRD Addendum. Documentation only, no code — included in
the pitch deck's positioning slide and here for the README.

## Mapping table

| VEIL mechanism | DPDP 2023 principle | How |
|---|---|---|
| DOM/regex detection runs before any screen capture leaves the device | **Data minimization** | Only the sanitized structure — never the raw values — is ever assembled for transmission. |
| Redaction happens before the one network call (Module 2 → Module 5) | **Purpose limitation** | The server receives only what it needs to decide the next UI action, nothing about the user's actual data. |
| Fail-closed kill switch (Feature 1, this addendum) | **Accountability** | A provable technical control, not a policy statement — the network call cannot fire if redaction didn't verifiably run. |
| Benchmark harness with published precision/recall/leakage numbers | **Demonstrable compliance** | Measured evidence of minimization working, not an unverified claim. |
| No server-side persistence of screenshots/skeletons across requests (Module 5, stateless per request) | **Storage limitation** | Nothing about a specific user's session is retained after the response is returned. |

## One-paragraph framing for the pitch

> VEIL's core mechanism — detect and redact personal data locally, transmit
> only the minimum structural information needed to complete a task — maps
> directly onto the data minimization and purpose limitation principles in
> India's Digital Personal Data Protection Act, 2023. This isn't a
> compliance feature bolted on afterward; it's the same architecture that
> produces the benchmark numbers on the previous slide.

## What this section is not

This is not a legal compliance certification and VEIL is not reviewed by
counsel. It is an architecture-to-principle mapping for pitch and README
framing — presented as such, not oversold as formal compliance.
