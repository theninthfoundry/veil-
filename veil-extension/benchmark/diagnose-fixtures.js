#!/usr/bin/env node
/**
 * Diagnostic: run the detector on every fixture and print what it finds.
 * Used to build accurate ground-truth for new adversarial fixtures.
 */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { scanForPII } = require('../core/detector');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');

for (const file of fs.readdirSync(FIXTURES_DIR).sort()) {
  if (!file.endsWith('.html')) continue;
  const html = fs.readFileSync(path.join(FIXTURES_DIR, file), 'utf8');
  const dom = new JSDOM(html);
  const detections = scanForPII(dom.window.document);

  console.log(`\n=== ${file} ===`);
  if (detections.length === 0) {
    console.log('  (no detections)');
    continue;
  }

  const counts = {};
  for (const d of detections) {
    counts[d.type] = (counts[d.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(counts).sort()) {
    console.log(`  ${type}: ${count}`);
  }

  // Show details for debugging
  for (const d of detections) {
    const tag = d.element ? d.element.tagName : 'null';
    const id = d.element ? (d.element.id || d.element.getAttribute('name') || '') : '';
    console.log(`    -> ${d.type} [${d.method}] conf=${d.confidence} tag=${tag} id/name="${id}"`);
  }
}
