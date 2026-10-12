#!/usr/bin/env node
/**
 * Mobile validation without EAS credentials: config + TypeScript.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const mobile = join(root, "apps", "mobile");

function fail(msg) {
  console.error(`mobile-validate: ${msg}`);
  process.exit(1);
}

for (const rel of ["package.json", "app.json", "App.tsx", "tsconfig.json", "index.js"]) {
  if (!existsSync(join(mobile, rel))) fail(`missing apps/mobile/${rel}`);
}

const pkg = JSON.parse(readFileSync(join(mobile, "package.json"), "utf8"));
if (pkg.name !== "@unison/mobile") fail(`unexpected package name: ${pkg.name}`);
if (!pkg.dependencies?.expo) fail("expo dependency missing");

const app = JSON.parse(readFileSync(join(mobile, "app.json"), "utf8"));
const expo = app.expo || app;
if (!expo.name && !expo.slug) fail("app.json missing expo name/slug");

const typecheck = spawnSync("pnpm", ["--filter", "@unison/mobile", "typecheck"], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
});
if (typecheck.status !== 0) {
  console.error(typecheck.stdout);
  console.error(typecheck.stderr);
  fail("mobile typecheck failed");
}

const lint = spawnSync("pnpm", ["--filter", "@unison/mobile", "lint"], {
  cwd: root,
  encoding: "utf8",
  env: process.env,
});
if (lint.status !== 0) {
  console.error(lint.stdout);
  console.error(lint.stderr);
  fail("mobile lint failed");
}

console.log("mobile-validate: ok");
