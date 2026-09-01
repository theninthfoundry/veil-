#!/usr/bin/env node
/**
 * VEIL benchmark harness — Phase 1
 *
 * Runs the DOM/regex detector (core/detector.js) against every labeled
 * fixture in benchmark/fixtures/ via jsdom, and scores it against
 * benchmark/ground-truth.json.
 *
 * Scoring method: per fixture and per type, count-based comparison —
 *   TP = min(detected, expected)
 *   FP = max(detected - expected, 0)
 *   FN = max(expected - detected, 0)
 * aggregated (micro-averaged) across all fixtures into one precision/recall
 * per type and overall. This is a counting proxy, not element-identity
 * matching — documented here rather than implied to be more than it is.
 *
 * This harness covers rubric criteria 1 (visual/structural accuracy, proxied
 * by DOM accuracy at this phase) and 2 (PII precision/recall) — 45% of the
 * total ISRO evaluation weight. Redaction-precision, resource, and latency
 * numbers require the live extension in a real browser (phase 3-4).
 *
 * Usage: node benchmark/run-benchmark.js
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { scanForPII } = require('../core/detector');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const GROUND_TRUTH = JSON.parse(fs.readFileSync(path.join(__dirname, 'ground-truth.json'), 'utf8'));

function countByType(detections) {
  const counts = {};
  for (const d of detections) {
    counts[d.type] = (counts[d.type] || 0) + 1;
  }
  return counts;
}

function runFixture(filename) {
  const html = fs.readFileSync(path.join(FIXTURES_DIR, filename), 'utf8');
  const dom = new JSDOM(html);
  const detections = scanForPII(dom.window.document);
  return countByType(detections);
}

function main() {
  const perType = {}; // type -> { tp, fp, fn }
  const rows = [];

  const fixtureFiles = Object.keys(GROUND_TRUTH).sort();

  for (const filename of fixtureFiles) {
    const expected = GROUND_TRUTH[filename];
    const detected = runFixture(filename);

    const allTypes = new Set([...Object.keys(expected), ...Object.keys(detected)]);
    const fixtureRow = { filename, details: [] };

    for (const type of allTypes) {
      const exp = expected[type] || 0;
      const got = detected[type] || 0;
      const tp = Math.min(exp, got);
      const fp = Math.max(got - exp, 0);
      const fn = Math.max(exp - got, 0);

      perType[type] = perType[type] || { tp: 0, fp: 0, fn: 0 };
      perType[type].tp += tp;
      perType[type].fp += fp;
      perType[type].fn += fn;

      if (exp || got) {
        fixtureRow.details.push({ type, exp, got, tp, fp, fn });
      }
    }

    rows.push(fixtureRow);
  }

  console.log('\nPer-fixture results\n' + '-'.repeat(60));
  for (const row of rows) {
    console.log(`\n${row.filename}`);
    if (row.details.length === 0) {
      console.log('  (no PII expected or detected)');
    }
    for (const d of row.details) {
      const flag = d.fp || d.fn ? '  <-- mismatch' : '';
      console.log(`  ${d.type.padEnd(12)} expected ${d.exp}, detected ${d.got}${flag}`);
    }
  }

  console.log('\n\nPer-type precision / recall\n' + '-'.repeat(60));
  let totalTp = 0;
  let totalFp = 0;
  let totalFn = 0;
  const typeNames = Object.keys(perType).sort();
  for (const type of typeNames) {
    const { tp, fp, fn } = perType[type];
    totalTp += tp;
    totalFp += fp;
    totalFn += fn;
    const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
    const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
    console.log(
      `${type.padEnd(12)} precision ${(precision * 100).toFixed(1).padStart(5)}%   recall ${(recall * 100)
        .toFixed(1)
        .padStart(5)}%   (tp=${tp} fp=${fp} fn=${fn})`
    );
  }

  const overallPrecision = totalTp + totalFp === 0 ? 1 : totalTp / (totalTp + totalFp);
  const overallRecall = totalTp + totalFn === 0 ? 1 : totalTp / (totalTp + totalFn);

  console.log('-'.repeat(60));
  console.log(
    `${'overall'.padEnd(12)} precision ${(overallPrecision * 100).toFixed(1).padStart(5)}%   recall ${(
      overallRecall * 100
    )
      .toFixed(1)
      .padStart(5)}%   (tp=${totalTp} fp=${totalFp} fn=${totalFn})`
  );
  console.log('');
}

main();
