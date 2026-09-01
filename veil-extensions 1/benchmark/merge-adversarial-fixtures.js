#!/usr/bin/env node
"use strict";
/**
 * merge-adversarial-fixtures.js
 * ---------------------------------------------------------------------------
 * Feature 8 (PRD Addendum, Lane A) support script.
 *
 * I don't have the real benchmark/ground-truth.json from your project in
 * this session, so this script does NOT assume its exact shape. Instead it:
 *
 *   1. Copies the 5 adversarial fixture HTML files into your real
 *      benchmark/fixtures/ directory.
 *   2. Reads your real ground-truth.json, detects whether it's a bare array
 *      or an object with a "labels"/"fixtures" key (the two shapes the
 *      README's description is consistent with), and appends the new
 *      entries in whichever shape it finds — never overwrites existing
 *      entries.
 *   3. Writes the result to ground-truth.json (backing up the original to
 *      ground-truth.json.bak first) and prints a summary you should
 *      eyeball before running the benchmark.
 *
 * Usage (run from your real veil-extension project root):
 *
 *   node path/to/this/merge-adversarial-fixtures.js \
 *     --fixtures-src ./path/to/veil-extensions/benchmark/fixtures \
 *     --additions ./path/to/veil-extensions/benchmark/ground-truth-additions.json \
 *     --target ./benchmark
 *
 * If your ground-truth.json shape doesn't match either case this script
 * detects, it prints the additions as JSON and exits without writing
 * anything, rather than guessing wrong and corrupting your file.
 * ---------------------------------------------------------------------------
 */

const fs = require("fs");
const path = require("path");

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    const key = argv[i].replace(/^--/, "");
    args[key] = argv[i + 1];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  const fixturesSrc = args["fixtures-src"];
  const additionsPath = args["additions"];
  const targetDir = args["target"] || "./benchmark";

  if (!fixturesSrc || !additionsPath) {
    console.error("Usage: node merge-adversarial-fixtures.js --fixtures-src <dir> --additions <file> [--target <dir>]");
    process.exit(1);
  }

  const additions = JSON.parse(fs.readFileSync(additionsPath, "utf8"));
  const newFixturesDir = path.join(targetDir, "fixtures");
  const groundTruthPath = path.join(targetDir, "ground-truth.json");

  // Step 1: copy fixture HTML files.
  fs.mkdirSync(newFixturesDir, { recursive: true });
  const fixtureFiles = fs.readdirSync(fixturesSrc).filter((f) => f.endsWith(".html"));
  for (const file of fixtureFiles) {
    fs.copyFileSync(path.join(fixturesSrc, file), path.join(newFixturesDir, file));
    console.log(`copied fixture: ${file}`);
  }

  // Step 2: merge ground truth, shape-detecting rather than assuming.
  if (!fs.existsSync(groundTruthPath)) {
    console.log(`No existing ground-truth.json at ${groundTruthPath} — writing a new one with just the adversarial labels.`);
    fs.writeFileSync(groundTruthPath, JSON.stringify(additions.labels, null, 2));
    return;
  }

  const raw = fs.readFileSync(groundTruthPath, "utf8");
  const existing = JSON.parse(raw);
  fs.writeFileSync(`${groundTruthPath}.bak`, raw);
  console.log(`backed up existing ground-truth.json -> ground-truth.json.bak`);

  let merged;
  if (Array.isArray(existing)) {
    merged = [...existing, ...additions.labels];
  } else if (existing && Array.isArray(existing.labels)) {
    merged = { ...existing, labels: [...existing.labels, ...additions.labels] };
  } else if (existing && Array.isArray(existing.fixtures)) {
    merged = { ...existing, fixtures: [...existing.fixtures, ...additions.labels] };
  } else {
    console.error(
      "ground-truth.json is in a shape this script doesn't recognize " +
      "(not a bare array, and no .labels or .fixtures array). Not writing " +
      "anything. Here are the additions to merge in by hand:\n"
    );
    console.error(JSON.stringify(additions.labels, null, 2));
    process.exit(1);
  }

  fs.writeFileSync(groundTruthPath, JSON.stringify(merged, null, 2));
  console.log(`merged ${additions.labels.length} adversarial label entries into ${groundTruthPath}`);
  console.log(`run your existing "npm run benchmark" and compare the new numbers against the old ones.`);
}

main();
