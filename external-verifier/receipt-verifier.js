/**
 * VEIL — Standalone Independent Receipt Verifier
 *
 * Zero-dependency independent verifier:
 * Validates cryptographic authenticity, payload commitments, and hash chain integrity
 * completely offline without running or trusting the VEIL extension runtime.
 */

const crypto = require('crypto');

function sha256(str) {
  return crypto.createHash('sha256').update(str, 'utf8').digest('hex');
}

function canonicalStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const entries = keys.map(k => JSON.stringify(k) + ':' + canonicalStringify(obj[k]));
  return '{' + entries.join(',') + '}';
}

/**
 * Independently validates an exported VEIL Security Receipt.
 *
 * @param {object} receipt - The parsed JSON receipt bundle
 * @returns {{ verdict: 'VALID'|'TAMPERED'|'INVALID'|'INCOMPLETE', verifiedEvents: number, headHash: string, sessionRootValid: boolean, errors: Array<string> }}
 */
function verifyReceipt(receipt) {
  const errors = [];

  if (!receipt || typeof receipt !== 'object') {
    return { verdict: 'INVALID', verifiedEvents: 0, headHash: '', sessionRootValid: false, errors: ['Null or non-object receipt'] };
  }

  if (receipt.receiptType !== 'VEIL_SECURITY_RECEIPT') {
    errors.push(`Invalid receiptType: expected "VEIL_SECURITY_RECEIPT", found "${receipt.receiptType}"`);
  }

  if (!Array.isArray(receipt.chain)) {
    return { verdict: 'INVALID', verifiedEvents: 0, headHash: '', sessionRootValid: false, errors: ['Missing chain array'] };
  }

  if (receipt.chain.length === 0) {
    return { verdict: 'VALID', verifiedEvents: 0, headHash: receipt.genesisHash || '', sessionRootValid: true, errors: [] };
  }

  let expectedPrev = receipt.chain[0].prevHash;
  let verifiedCount = 0;

  for (let i = 0; i < receipt.chain.length; i++) {
    const evt = receipt.chain[i];

    // 1. Check prevHash link
    if (evt.prevHash !== expectedPrev) {
      errors.push(`Broken chain link at event index ${i}: expected prevHash ${expectedPrev}, found ${evt.prevHash}`);
      return { verdict: 'TAMPERED', verifiedEvents: verifiedCount, headHash: '', sessionRootValid: false, errors };
    }

    // 2. Recompute and check payload hash
    if (evt.payloadHash !== undefined) {
      const cleanDetail = evt.detail || {};
      const serializedPayload = canonicalStringify(cleanDetail);
      const calculatedPayloadHash = sha256(serializedPayload);

      if (calculatedPayloadHash !== evt.payloadHash) {
        errors.push(`Tampered payload hash at event index ${i}: calculated ${calculatedPayloadHash}, stored ${evt.payloadHash}`);
        return { verdict: 'TAMPERED', verifiedEvents: verifiedCount, headHash: '', sessionRootValid: false, errors };
      }

      // 3. Recompute and check header hash
      const headerString = `${evt.prevHash}:${evt.eventIndex}:${evt.timestamp}:${evt.type}:${evt.payloadHash}`;
      const calculatedEventHash = sha256(headerString);

      if (calculatedEventHash !== evt.hash) {
        errors.push(`Tampered event header hash at event index ${i}: recomputed ${calculatedEventHash}, stored ${evt.hash}`);
        return { verdict: 'TAMPERED', verifiedEvents: verifiedCount, headHash: '', sessionRootValid: false, errors };
      }

      expectedPrev = evt.hash;
    } else {
      // Spec-11 canonical event format: { prevHash, payload, eventHash }
      const declaredEventHash = evt.eventHash || evt.hash;
      const calc1 = sha256(evt.prevHash + JSON.stringify(evt.payload || {}));
      const calc2 = sha256(evt.prevHash + canonicalStringify(evt.payload || {}));

      if (declaredEventHash !== calc1 && declaredEventHash !== calc2) {
        errors.push(`Tampered event hash at index ${i}: declared ${declaredEventHash}`);
        return { verdict: 'TAMPERED', verifiedEvents: verifiedCount, headHash: '', sessionRootValid: false, errors };
      }

      expectedPrev = declaredEventHash;
    }

    verifiedCount++;
  }

  // 4. Verify terminal head hash matches claimed headHash
  const finalEvent = receipt.chain[receipt.chain.length - 1];
  const finalHash = finalEvent.hash || finalEvent.eventHash;
  if (receipt.headHash && receipt.headHash !== finalHash) {
    errors.push(`Claimed headHash "${receipt.headHash}" does not match final event hash "${finalHash}"`);
    return { verdict: 'TAMPERED', verifiedEvents: verifiedCount, headHash: finalHash, sessionRootValid: false, errors };
  }

  // 5. Verify session root if checkpoints exist
  let sessionRootValid = true;
  if (Array.isArray(receipt.checkpoints) && receipt.sessionRoot) {
    const cpHashes = receipt.checkpoints.map(cp => cp.checkpointHash).join(':');
    const calculatedRoot = sha256(`SESSION_ROOT:${receipt.headHash}:${cpHashes}:${receipt.chain.length}`);
    sessionRootValid = (calculatedRoot === receipt.sessionRoot);
    if (!sessionRootValid) {
      errors.push(`Session root mismatch: calculated ${calculatedRoot}, claimed ${receipt.sessionRoot}`);
    }
  } else if (receipt.sessionRoot && !Array.isArray(receipt.checkpoints)) {
    sessionRootValid = (receipt.sessionRoot === finalHash);
    if (!sessionRootValid) {
      errors.push(`Session root mismatch: expected ${finalHash}, claimed ${receipt.sessionRoot}`);
    }
  }

  const verdict = errors.length === 0 ? 'VALID' : (verifiedCount > 0 ? 'TAMPERED' : 'INVALID');

  return {
    verdict,
    verifiedEvents: verifiedCount,
    headHash: finalHash,
    sessionRootValid,
    errors
  };
}

module.exports = {
  verifyReceipt,
  canonicalStringify,
  sha256
};
