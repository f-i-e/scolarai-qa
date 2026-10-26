#!/usr/bin/env node
/**
 * Refresh tests/backend/fixtures/openapi-spec.json from core-backend (develop).
 * Run from scolarai-qa root: node scripts/sync-openapi.cjs
 */
const fs = require("fs");
const path = require("path");

const qaRoot = path.resolve(__dirname, "..");
const candidates = [
  path.resolve(qaRoot, "../core-backend/openapi-spec.json"),
  path.resolve(qaRoot, "../core-backend/docs/openapi/openapi-spec.json"),
];

const source = candidates.find((p) => fs.existsSync(p));
if (!source) {
  console.error("Could not find core-backend openapi-spec.json next to scolarai-qa.");
  process.exit(1);
}

const dest = path.join(qaRoot, "tests/backend/fixtures/openapi-spec.json");
fs.copyFileSync(source, dest);
console.log(`Copied ${source} → ${dest}`);
