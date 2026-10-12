#!/usr/bin/env node
/**
 * Desktop build validation without requiring signing secrets or a full Tauri release build.
 * Checks scaffold integrity + JSON/TOML presence; optional cargo check when RUST_CI=1.
 */
import { existsSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

const root = resolve(import.meta.dirname, "..");
const desktop = join(root, "apps", "desktop");
const tauriDir = join(desktop, "src-tauri");

function fail(msg) {
  console.error(`desktop-validate: ${msg}`);
  process.exit(1);
}

const required = [
  join(desktop, "package.json"),
  join(tauriDir, "Cargo.toml"),
  join(tauriDir, "tauri.conf.json"),
  join(tauriDir, "src", "main.rs"),
  join(tauriDir, "build.rs"),
];

for (const path of required) {
  if (!existsSync(path)) fail(`missing ${path}`);
}

const pkg = JSON.parse(readFileSync(join(desktop, "package.json"), "utf8"));
if (pkg.name !== "@unison/desktop") fail(`unexpected package name: ${pkg.name}`);
for (const script of ["build", "lint", "typecheck", "tauri:build", "tauri:dev"]) {
  if (!pkg.scripts?.[script]) fail(`missing script: ${script}`);
}

const conf = JSON.parse(readFileSync(join(tauriDir, "tauri.conf.json"), "utf8"));
if (conf.productName !== "UNISON") fail("tauri.conf.json productName must be UNISON");
if (conf.identifier !== "com.unison.desktop") fail("unexpected Tauri identifier");
if (!conf.build?.devUrl?.includes("43127")) fail("devUrl must point at web :43127");
const schemes = conf.plugins?.["deep-link"]?.desktop?.schemes || [];
if (!schemes.includes("unison")) fail("deep-link scheme 'unison' missing");

const cargo = readFileSync(join(tauriDir, "Cargo.toml"), "utf8");
if (!/name\s*=\s*"unison-desktop"/.test(cargo)) fail("Cargo.toml package name mismatch");
if (!/tauri\s*=/.test(cargo)) fail("Cargo.toml missing tauri dependency");

const mainRs = readFileSync(join(tauriDir, "src", "main.rs"), "utf8");
if (!mainRs.includes("fn main()")) fail("main.rs missing fn main()");

// Run package scripts (stubs today; still must succeed).
for (const script of ["lint", "typecheck", "build"]) {
  const r = spawnSync("pnpm", ["--filter", "@unison/desktop", script], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (r.status !== 0) {
    console.error(r.stdout);
    console.error(r.stderr);
    fail(`pnpm --filter @unison/desktop ${script} failed`);
  }
}

if (process.env.RUST_CI === "1") {
  const check = spawnSync("cargo", ["check", "--manifest-path", join(tauriDir, "Cargo.toml")], {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });
  if (check.status !== 0) {
    console.error(check.stdout);
    console.error(check.stderr);
    fail("cargo check failed (set RUST_CI=0 to skip)");
  }
} else {
  console.log("desktop-validate: skipping cargo check (RUST_CI!=1; Tauri 2 needs newer Rust toolchain)");
}

console.log("desktop-validate: ok");
