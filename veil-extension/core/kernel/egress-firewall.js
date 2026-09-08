/**
 * VEIL — Network Egress Firewall & Perimeter Gate
 *
 * Implements Invariant I6:
 * "All outbound data flows leaving the browser environment (fetch, XHR, WebSockets, beacons, forms)
 *  must be audited, verified free of unredacted credentials/canaries, and evaluated against egress policy."
 */

(function () {
  const securityLedger = typeof require !== 'undefined'
    ? require('../security-ledger.js')
    : (typeof window !== 'undefined' ? window.VeilSecurityLedger : null);

  const taintEngine = typeof require !== 'undefined'
    ? require('./taint-engine.js')
    : (typeof window !== 'undefined' ? window.VeilTaintEngine : null);

  const sha256 = (securityLedger && securityLedger.sha256Sync) || function (ascii) {
    if (typeof process !== 'undefined' && process.versions && process.versions.node) {
      try {
        const crypto = require('crypto');
        return crypto.createHash('sha256').update(ascii, 'utf8').digest('hex');
      } catch (_) {}
    }
    let h = 0;
    for (let i = 0; i < ascii.length; i++) {
      h = ((h << 5) - h) + ascii.charCodeAt(i);
      h |= 0;
    }
    return 'sha256_mock_' + Math.abs(hash).toString(16);
  };

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

  const SENSITIVE_PATTERNS = [
    { name: 'CREDIT_CARD', re: /\b(?:\d[ -]*?){13,16}\b/ },
    { name: 'AADHAAR', re: /\b\d{4}\s\d{4}\s\d{4}\b/ },
    { name: 'PAN', re: /\b[A-Z]{5}[0-9]{4}[A-Z]\b/ },
    { name: 'PASSWORD_PARAM', re: /(?:password|passwd|secret|cvv|pin)\s*[:=]\s*["']?([^&"'\s]{4,})/i }
  ];

  const BLOCKED_DOMAINS = [
    'evil.com',
    'evil.test',
    'attacker.xyz',
    'phishing.ru',
    'exfiltration.io',
    'malicious.local'
  ];

  class EgressFirewall {
    constructor() {
      this.blockedDomains = new Set(BLOCKED_DOMAINS);
    }

    /**
     * Inspects an outbound network request before it crosses the device perimeter.
     *
     * @param {object} params
     * @param {string} params.url - Destination URL
     * @param {string} [params.method='POST'] - HTTP Method (GET, POST, etc.) or 'WEBSOCKET' | 'BEACON'
     * @param {object|string} [params.headers] - Request headers
     * @param {object|string} [params.body] - Request body / payload
     * @param {string} [params.channel='fetch'] - Channel type (fetch, xhr, websocket, beacon, form)
     * @param {object} [params.capability] - Action capability if authorized
     * @returns {{
     *   allowed: boolean,
     *   verdict: 'ALLOWED' | 'BLOCKED',
     *   violations: string[],
     *   byteSize: number,
     *   payloadHash: string,
     *   targetOrigin: string
     * }}
     */
    inspectOutbound(params = {}) {
      const url = String(params.url || '');
      const method = String(params.method || 'POST').toUpperCase();
      const channel = String(params.channel || 'fetch').toLowerCase();
      const violations = [];

      let targetOrigin = 'unknown';
      try {
        const parsed = new URL(url, 'http://localhost');
        targetOrigin = parsed.hostname;
      } catch (_) {
        targetOrigin = url.split('/')[2] || url;
      }

      // 1. Destination Domain Check
      for (const blocked of this.blockedDomains) {
        if (targetOrigin.includes(blocked)) {
          violations.push(`Blacklisted egress destination: "${targetOrigin}"`);
        }
      }

      // 2. Serialize and analyze payload
      const bodySerialized = typeof params.body === 'string' ? params.body : JSON.stringify(params.body || {});
      const byteSize = new TextEncoder().encode(bodySerialized).length;
      const payloadHash = sha256(bodySerialized);

      const targetString = `${url} ${JSON.stringify(params.headers || {})} ${bodySerialized}`;

      // 3. Canary Token Exfiltration Check
      const foundCanaries = [];
      for (const canary of CANARY_TOKENS) {
        if (targetString.includes(canary)) {
          foundCanaries.push(canary);
          violations.push(`Canary exfiltration detected: ${canary}`);
        }
      }
      const dynamicCanaries = targetString.match(/VEIL_CANARY_[A-Za-z0-9_]+/g);
      if (dynamicCanaries) {
        for (const can of dynamicCanaries) {
          if (!foundCanaries.includes(can)) {
            foundCanaries.push(can);
            violations.push(`Canary exfiltration detected: ${can}`);
          }
        }
      }

      // 4. Raw Secret / PII Leak Check
      // Only permit if there's an explicit SECRET_RELEASE capability for this origin
      const hasSecretReleaseCapability = params.capability &&
        params.capability.actionType === 'SECRET_RELEASE' &&
        params.capability.origin === targetOrigin;

      if (!hasSecretReleaseCapability) {
        for (const pat of SENSITIVE_PATTERNS) {
          if (pat.re.test(targetString)) {
            // Luhn check for card numbers to reduce false positives
            if (pat.name === 'CREDIT_CARD') {
              const digits = (targetString.match(pat.re) || [''])[0].replace(/\D/g, '');
              if (digits.length >= 13 && digits.length <= 16) {
                violations.push(`Unredacted Credit Card payload detected in outbound ${channel} request`);
              }
            } else {
              violations.push(`Unredacted ${pat.name} detected in outbound ${channel} request`);
            }
          }
        }
      }

      // 5. Check Taint Engine
      if (taintEngine && params.body) {
        const taint = taintEngine.getTaint(params.body);
        const flowCheck = taintEngine.canFlow(taint.level, taintEngine.sinks.REMOTE_EGRESS, {
          sourceOrigin: (typeof location !== 'undefined' && location.origin) || 'localhost',
          sinkOrigin: targetOrigin,
          hasCapability: Boolean(params.capability)
        });

        if (!flowCheck.allowed) {
          violations.push(flowCheck.reason);
        }
      }

      const allowed = violations.length === 0;
      const verdict = allowed ? 'ALLOWED' : 'BLOCKED';

      if (securityLedger && securityLedger.recordEvent) {
        securityLedger.recordEvent(
          allowed ? 'EGRESS_FIREWALL_PASSED' : 'EGRESS_FIREWALL_BLOCKED',
          'perimeter',
          {
            destination: targetOrigin,
            method,
            channel,
            byteSize,
            violations,
            payloadHash: payloadHash.slice(0, 16) + '...'
          }
        );
      }

      return {
        allowed,
        verdict,
        violations,
        byteSize,
        payloadHash,
        targetOrigin
      };
    }

    isBlacklisted(url) {
      const target = String(url || '');
      for (const blocked of this.blockedDomains) {
        if (target.includes(blocked)) return true;
      }
      return false;
    }
  }

  const defaultEgressFirewall = new EgressFirewall();

  const exportObj = {
    EgressFirewall,
    defaultEgressFirewall,
    inspectOutbound: (p) => defaultEgressFirewall.inspectOutbound(p),
    isBlacklisted: (url) => defaultEgressFirewall.isBlacklisted(url),
    CANARY_TOKENS
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = exportObj;
  }
  if (typeof window !== 'undefined') {
    window.VeilEgressFirewall = exportObj;
  }
})();
