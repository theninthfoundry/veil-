#!/usr/bin/env node
/**
 * Detailed diagnostic: show the exact matched text for each detection.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

// We need to get inside the detector to see what text is matching.
// Let's load the problem fixtures and manually run the regexes.

const PHONE_RE = /(?:\+\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]\d{3,4}[-.\s]?\d{2,4}\b/g;
const CC_CANDIDATE_RE = /\b(?:\d[ -]?){12,19}\b/g;

function luhnCheck(raw) {
  const digits = raw.replace(/\D/g, '');
  if (digits.length < 12 || digits.length > 19) return false;
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let d = parseInt(digits[i], 10);
    if (double) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    double = !double;
  }
  return sum % 10 === 0;
}

function scanText(label, text) {
  console.log(`\n--- ${label} ---`);
  console.log(`Text: "${text.trim().substring(0, 100)}..."`);

  PHONE_RE.lastIndex = 0;
  let m;
  while ((m = PHONE_RE.exec(text))) {
    console.log(`  PHONE match: "${m[0]}" at ${m.index}`);
  }

  CC_CANDIDATE_RE.lastIndex = 0;
  while ((m = CC_CANDIDATE_RE.exec(text))) {
    const valid = luhnCheck(m[0]);
    console.log(`  CC candidate: "${m[0]}" luhn=${valid} at ${m.index}`);
  }
}

// Check bank-dashboard.html
const bankHtml = fs.readFileSync('benchmark/fixtures/bank-dashboard.html', 'utf8');
const bankDom = new JSDOM(bankHtml);
const bankDoc = bankDom.window.document;

// Walk all text nodes
const walker = bankDoc.createTreeWalker(bankDoc.body, 4);
let node;
while ((node = walker.nextNode())) {
  const text = node.textContent;
  if (!text || !text.trim()) continue;
  const parent = node.parentElement;
  const tag = parent ? parent.tagName : '?';
  PHONE_RE.lastIndex = 0;
  if (PHONE_RE.test(text)) {
    scanText(`bank-dashboard ${tag}`, text);
  }
}

// Check social-profile.html for the false CC
console.log('\n\n=== SOCIAL PROFILE CC CHECK ===');
const socialHtml = fs.readFileSync('benchmark/fixtures/social-profile.html', 'utf8');
const socialDom = new JSDOM(socialHtml);
const socialDoc = socialDom.window.document;
const sw = socialDoc.createTreeWalker(socialDoc.body, 4);
while ((node = sw.nextNode())) {
  const text = node.textContent;
  if (!text || !text.trim()) continue;
  CC_CANDIDATE_RE.lastIndex = 0;
  if (CC_CANDIDATE_RE.test(text)) {
    scanText(`social ${node.parentElement.tagName}`, text);
  }
}

// Check false-positive-stress.html for the false phone
console.log('\n\n=== FALSE POSITIVE STRESS PHONE CHECK ===');
const stressHtml = fs.readFileSync('benchmark/fixtures/false-positive-stress.html', 'utf8');
const stressDom = new JSDOM(stressHtml);
const stressDoc = stressDom.window.document;
const stw = stressDoc.createTreeWalker(stressDoc.body, 4);
while ((node = stw.nextNode())) {
  const text = node.textContent;
  if (!text || !text.trim()) continue;
  PHONE_RE.lastIndex = 0;
  if (PHONE_RE.test(text)) {
    scanText(`stress ${node.parentElement.tagName}`, text);
  }
}
