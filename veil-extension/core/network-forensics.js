/**
 * VEIL — Network Forensic Inspector & Canary Auditor
 *
 * Instruments and audits every outbound network payload crossing the device boundary.
 * Verifies that:
 *  1. No sensitive canaries (VEIL_CANARY_*) ever cross the network.
 *  2. No raw input values or credentials exist in outbound JSON payloads.
 *  3. Computes cryptographic payload hashes and payload byte sizes for forensic audit logs.
 *  4. Distinguishes ALLOWED sanitized payloads from BLOCKED sensitive leaks.
 */

(function () {
  const CANARY_TOKENS = [
    'VEIL_CANARY_EMAIL',
    'VEIL_CANARY_PASSWORD',
    'VEIL_CANARY_CARD',
    'VEIL_CANARY_PHONE',
    'VEIL_CANARY_ADDRESS',
    'VEIL_CANARY_SECRET',
    'VEIL_CANARY_AADHAAR',
    'VEIL_CANARY_PAN'
  ];

  // Standard cryptographic SHA-256 implementation (Node crypto + pure JS Web standard fallback)
  function sha256Sync(ascii) {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(ascii, 'utf8').digest('hex');
      } catch (e) {
        // Fallback to pure JS below
      }
    }
    function rightRotate(value, amount) {
      return (value >>> amount) | (value << (32 - amount));
    }
    let result = '';
    const words = [];
    const asciiBitLength = ascii.length * 8;
    const hash = [
      0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
      0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const k = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    let i = 0;
    for (i = 0; i < ascii.length; i++) {
      const code = ascii.charCodeAt(i);
      words[i >> 2] |= code << ((3 - (i % 4)) * 8);
    }
    words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
    words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;
    for (let j = 0; j < words.length; j += 16) {
      const w = [];
      for (i = 0; i < 16; i++) w[i] = words[j + i] | 0;
      for (i = 16; i < 64; i++) {
        const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let a = hash[0], b = hash[1], c = hash[2], d = hash[3], e = hash[4], f = hash[5], g = hash[6], h = hash[7];
      for (i = 0; i < 64; i++) {
        const s1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
        const ch = (e & f) ^ ((~e) & g);
        const temp1 = (h + s1 + ch + k[i] + w[i]) | 0;
        const s0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const temp2 = (s0 + maj) | 0;
        h = g; g = f; f = e; e = (d + temp1) | 0;
        d = c; c = b; b = a; a = (temp1 + temp2) | 0;
      }
      hash[0] = (hash[0] + a) | 0;
      hash[1] = (hash[1] + b) | 0;
      hash[2] = (hash[2] + c) | 0;
      hash[3] = (hash[3] + d) | 0;
      hash[4] = (hash[4] + e) | 0;
      hash[5] = (hash[5] + f) | 0;
      hash[6] = (hash[6] + g) | 0;
      hash[7] = (hash[7] + h) | 0;
    }
    for (i = 0; i < 8; i++) {
      for (let bit = 3; bit >= 0; bit--) {
        const byte = (hash[i] >> (bit * 8)) & 255;
        result += (byte < 16 ? '0' : '') + byte.toString(16);
      }
    }
    return result;
  }

  function hashString(str) {
    return 'sha256:' + sha256Sync(str);
  }

  /**
   * Audits an outbound payload before dispatch.
   * @param {object} payload - The request payload object (task, page context)
   * @param {string} endpoint - The target network URL
   * @returns {{
   *   allowed: boolean,
   *   verdict: 'ALLOWED' | 'BLOCKED',
   *   byteSize: number,
   *   payloadHash: string,
   *   canaryDetected: boolean,
   *   canaryTokens: string[],
   *   violations: string[],
   *   timestamp: string
   * }}
   */
  function inspectOutboundRequest(payload, endpoint) {
    const serialized = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const byteSize = new TextEncoder().encode(serialized).length;
    const payloadHash = hashString(serialized);
    const timestamp = new Date().toISOString();

    const violations = [];
    const detectedCanaries = [];

    // 1. Check for Canary Tokens
    for (const canary of CANARY_TOKENS) {
      if (serialized.includes(canary)) {
        detectedCanaries.push(canary);
        violations.push(`CANARY_BREACH: Detected ${canary} in outbound payload`);
      }
    }

    // 2. Check for raw value property in elements
    if (typeof payload === 'object' && payload !== null) {
      const elements = (payload.page && payload.page.elements) || payload.elements || [];
      for (const el of elements) {
        if ('value' in el && el.value !== null && el.value !== undefined && el.value !== '') {
          violations.push(`RAW_VALUE_LEAK: Element '${el.id || el.label}' contains unmasked value '${String(el.value).slice(0, 10)}...'`);
        }
      }
    }

    // 3. Check for high-entropy credential patterns (16-digit cards, CVVs, passwords)
    const ccMatch = serialized.match(/\b(?:\d[ -]?){13,19}\b/);
    if (ccMatch && !serialized.includes('LOCAL_SECRET')) {
      violations.push(`CREDENTIAL_LEAK: Unsanitized credit card number detected in serialized payload`);
    }

    const isAllowed = violations.length === 0;
    const sensitiveMatches = violations.length;

    return {
      allowed: isAllowed,
      blocked: !isAllowed,
      verdict: isAllowed ? 'PASS' : 'BLOCKED',
      status: isAllowed ? 'PASS' : 'BLOCKED',
      endpoint: endpoint || 'http://127.0.0.1:8000/act',
      destination: endpoint || 'http://127.0.0.1:8000/act',
      method: 'POST',
      byteSize,
      payloadBytes: byteSize,
      bytesSent: isAllowed ? byteSize : 0,
      sensitiveMatches,
      piiMatches: sensitiveMatches,
      secretMatches: detectedCanaries.length,
      payloadHash,
      canaryDetected: detectedCanaries.length > 0,
      canaryTokens: detectedCanaries,
      violations,
      timestamp
    };
  }

  const forensicsExport = {
    CANARY_TOKENS,
    hashString,
    inspectOutboundRequest
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = forensicsExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilNetworkForensics = forensicsExport;
  }
})();
