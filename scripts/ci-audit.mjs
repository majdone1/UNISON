#!/usr/bin/env node
/**
 * Dependency vulnerability scan.
 * Fails on critical findings. High/moderate from Expo transitive trees are reported
 * but do not fail CI until upstream Expo patches land (see docs/CI.md).
 */
import { spawnSync } from "node:child_process";

const root = process.cwd();

function run(level) {
  return spawnSync("pnpm", ["audit", `--audit-level=${level}`], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
}

console.log("ci-audit: scanning (fail on critical)…");
const critical = run("critical");
process.stdout.write(critical.stdout || "");
process.stderr.write(critical.stderr || "");

if (critical.status !== 0) {
  console.error("ci-audit: CRITICAL vulnerabilities present — failing");
  process.exit(critical.status || 1);
}

console.log("ci-audit: no critical findings; reporting high+ for visibility…");
const high = run("high");
process.stdout.write(high.stdout || "");
process.stderr.write(high.stderr || "");
if (high.status !== 0) {
  console.warn(
    "ci-audit: high/moderate advisories remain (mostly Expo transitive). Tracked; not failing CI. See docs/CI.md.",
  );
}

console.log("ci-audit: ok");
