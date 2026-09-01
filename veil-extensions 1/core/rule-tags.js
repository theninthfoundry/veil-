/**
 * core/rule-tags.js
 * ---------------------------------------------------------------------------
 * Feature 7 (PRD Addendum, Lane A): "why was this redacted" support.
 *
 * This does NOT replace core/detector.js's detection logic (not built here —
 * that file isn't in my hands this session). It's the small, additive piece:
 * a fixed vocabulary of rule-tag strings, plus a validator, so that whichever
 * detector branch fires can attach one of these to its DetectionResult
 * instead of inventing an ad-hoc string per call site.
 *
 * INTEGRATION POINT (in the real extension, not built here):
 *   In core/detector.js, wherever a branch currently returns/pushes a
 *   DetectionResult without a `matchedRule` field, add one:
 *
 *     // before:
 *     results.push({ type: "credit_card", source: "dom", confidence: 0.95, ... });
 *
 *     // after:
 *     results.push({
 *       type: "credit_card", source: "dom", confidence: 0.95,
 *       matchedRule: RULE_TAGS.CC_AUTOCOMPLETE, ...
 *     });
 *
 *   In popup/popup.js's dashboard rendering, thread `matchedRule` through to
 *   a hover tooltip on each redacted-field counter using
 *   describeRule(tag).
 * ---------------------------------------------------------------------------
 */

"use strict";

const RULE_TAGS = Object.freeze({
  // --- attribute-based (highest confidence) ---
  EMAIL_TYPE_ATTR: "attr:type=email",
  EMAIL_AUTOCOMPLETE: "attr:autocomplete=email",
  PASSWORD_TYPE_ATTR: "attr:type=password",
  CC_AUTOCOMPLETE: "attr:autocomplete=cc-number",
  CC_NAME_ATTR: "attr:name~=card",
  CVV_AUTOCOMPLETE: "attr:autocomplete=cc-csc",
  CVV_NAME_ATTR: "attr:name~=cvv|cvc",
  PHONE_TYPE_ATTR: "attr:type=tel",
  PHONE_AUTOCOMPLETE: "attr:autocomplete=tel",
  ADDRESS_AUTOCOMPLETE: "attr:autocomplete=address",
  NAME_AUTOCOMPLETE: "attr:autocomplete=name",

  // --- keyword heuristics (field name / nearby label text) ---
  KEYWORD_CVV_NEAR_CARD: "keyword:cvv-near-card-field",
  KEYWORD_ADDRESS_LABEL: "keyword:address-label-text",
  KEYWORD_NAME_FIELD_NAME: "keyword:name-field-name",

  // --- free-text regex + validation ---
  REGEX_EMAIL: "regex:email",
  REGEX_CARD_LUHN: "regex:card+luhn",
  REGEX_PHONE_FORMATTED: "regex:phone+separator",
  REGEX_AADHAAR_SHAPE: "regex:aadhaar-shape",
  REGEX_PAN_SHAPE: "regex:pan-shape",

  // --- overlap arbitration (two rules matched, one was chosen by specificity) ---
  ARBITRATED_CARD_OVER_AADHAAR: "arbitration:card-luhn-over-aadhaar-shape",
  ARBITRATED_AADHAAR_OVER_PHONE: "arbitration:aadhaar-shape-over-phone-shape",

  // --- vision (Module 3, currently a stub per README) ---
  VISION_FACE_DETECTED: "vision:face-detected",
});

const RULE_DESCRIPTIONS = Object.freeze({
  [RULE_TAGS.EMAIL_TYPE_ATTR]: "Input has type=\"email\"",
  [RULE_TAGS.EMAIL_AUTOCOMPLETE]: "Input has autocomplete=\"email\"",
  [RULE_TAGS.PASSWORD_TYPE_ATTR]: "Input has type=\"password\"",
  [RULE_TAGS.CC_AUTOCOMPLETE]: "Input has autocomplete=\"cc-number\"",
  [RULE_TAGS.CC_NAME_ATTR]: "Input's name attribute contains \"card\"",
  [RULE_TAGS.CVV_AUTOCOMPLETE]: "Input has autocomplete=\"cc-csc\"",
  [RULE_TAGS.CVV_NAME_ATTR]: "Input's name attribute contains \"cvv\" or \"cvc\"",
  [RULE_TAGS.PHONE_TYPE_ATTR]: "Input has type=\"tel\"",
  [RULE_TAGS.PHONE_AUTOCOMPLETE]: "Input has autocomplete=\"tel\"",
  [RULE_TAGS.ADDRESS_AUTOCOMPLETE]: "Input has autocomplete starting with \"address\"",
  [RULE_TAGS.NAME_AUTOCOMPLETE]: "Input has autocomplete=\"name\"",
  [RULE_TAGS.KEYWORD_CVV_NEAR_CARD]: "3-4 digit field found adjacent to a detected card field",
  [RULE_TAGS.KEYWORD_ADDRESS_LABEL]: "Nearby label text matched an address keyword",
  [RULE_TAGS.KEYWORD_NAME_FIELD_NAME]: "Field name/id matched a name-field heuristic",
  [RULE_TAGS.REGEX_EMAIL]: "Free text matched the email pattern",
  [RULE_TAGS.REGEX_CARD_LUHN]: "Free text matched a card-number pattern and passed the Luhn check",
  [RULE_TAGS.REGEX_PHONE_FORMATTED]: "Free text matched a formatted phone-number pattern",
  [RULE_TAGS.REGEX_AADHAAR_SHAPE]: "Free text matched the Aadhaar-shaped digit pattern",
  [RULE_TAGS.REGEX_PAN_SHAPE]: "Free text matched the PAN-shaped pattern",
  [RULE_TAGS.ARBITRATED_CARD_OVER_AADHAAR]: "Matched both card and Aadhaar shape; classified as card (Luhn-valid, more specific)",
  [RULE_TAGS.ARBITRATED_AADHAAR_OVER_PHONE]: "Matched both Aadhaar and phone shape; classified as Aadhaar (more specific pattern)",
  [RULE_TAGS.VISION_FACE_DETECTED]: "Local vision model detected a face region",
});

/**
 * @param {string} tag - one of RULE_TAGS' values
 * @returns {string} human-readable explanation for the dashboard tooltip
 */
function describeRule(tag) {
  return RULE_DESCRIPTIONS[tag] || `Unrecognized rule tag: ${tag}`;
}

/**
 * Dev-time guard: call this in a test to ensure every detector branch that's
 * supposed to attach a matchedRule actually attaches one from the known
 * vocabulary, so a typo'd ad-hoc string never silently reaches the dashboard.
 * @param {string} tag
 * @returns {boolean}
 */
function isKnownRuleTag(tag) {
  return Object.values(RULE_TAGS).includes(tag);
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { RULE_TAGS, RULE_DESCRIPTIONS, describeRule, isKnownRuleTag };
}
