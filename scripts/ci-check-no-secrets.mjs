#!/usr/bin/env node
/**
 * Fail if credential-like files or high-confidence secret patterns are committed.
 * Complements gitleaks; keeps CI usable in demo mode without live keys.
 */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

function fail(msg) {
  console.error(`secrets-check: ${msg}`);
  process.exit(1);
}

const tracked = execSync("git ls-files", { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const bannedNames = [
  /^\.env$/,
  /^\.env\./,
  /\/\.env$/,
  /\/\.env\./,
  /(^|\/)id_rsa$/,
  /(^|\/)id_ed25519$/,
  /\.pem$/i,
  /\.p12$/i,
  /\.mobileprovision$/i,
  /(^|\/)credentials\.json$/i,
  /(^|\/)service-account.*\.json$/i,
];

for (const file of tracked) {
  if (file.endsWith(".env.example") || file.includes(".env.example")) continue;
  for (const re of bannedNames) {
    if (re.test(file)) fail(`credential-like file is tracked: ${file}`);
  }
}

// High-confidence value patterns (avoid matching docs / examples / demo placeholders).
const patterns = [
  {
    name: "AWS access key",
    re: /AKIA[0-9A-Z]{16}/,
  },
  {
    name: "Stripe live secret",
    re: /\bsk_live_[0-9a-zA-Z]{16,}\b/,
  },
  {
    name: "GitHub PAT",
    re: /\bghp_[0-9A-Za-z]{30,}\b/,
  },
  {
    name: "OpenAI key",
    re: /\bsk-[a-zA-Z0-9]{32,}\b/,
  },
  {
    name: "Private key block",
    re: /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
  },
  {
    name: "Supabase service role JWT (live-looking)",
    re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/,
  },
];

const skipDirs = ["node_modules/", ".git/", "pnpm-lock.yaml", "agent-tools/"];
const textExt = /\.(ts|tsx|js|jsx|mjs|cjs|json|md|yml|yaml|toml|sql|env|sh|rs|css|html|txt)$/i;

let hits = 0;
for (const file of tracked) {
  if (skipDirs.some((p) => file.startsWith(p) || file === p.replace(/\/$/, ""))) continue;
  if (file === "pnpm-lock.yaml") continue;
  if (!textExt.test(file) && !file.includes(".env")) continue;

  let body;
  try {
    body = readFileSync(file, "utf8");
  } catch {
    continue;
  }

  // Allow empty placeholder assignments in .env.example
  if (file.endsWith(".env.example")) continue;

  for (const { name, re } of patterns) {
    if (re.test(body)) {
      // Allow docs mentioning pattern shapes without real values — require length/context.
      if (name.includes("JWT") && /example|placeholder|YOUR_|<.*>/i.test(body) && body.length < 2000) {
        continue;
      }
      console.error(`secrets-check: possible ${name} in ${file}`);
      hits += 1;
    }
  }
}

if (hits > 0) {
  fail(`found ${hits} possible committed secret(s)`);
}

console.log(`secrets-check: ok (scanned ${tracked.length} tracked files)`);
