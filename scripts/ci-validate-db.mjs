#!/usr/bin/env node
/**
 * CI database / schema validation (no live Supabase required).
 * Ensures migrations exist, required tables are defined, and RLS is enabled.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const migrationsDir = join(root, "supabase", "migrations");

const requiredTables = [
  "profiles",
  "platform_roles",
  "organizations",
  "org_memberships",
  "org_invitations",
  "workspaces",
  "teams",
  "team_members",
  "boards",
  "board_groups",
  "board_columns",
  "board_items",
  "board_views",
  "comments",
  "notifications",
  "attachments",
  "activity_events",
  "audit_logs",
  "subscriptions",
  "automations",
  "board_forms",
  "webhook_deliveries",
  "automation_runs",
  "notification_preferences",
  "time_entries",
  "custom_roles",
  "chat_channels",
  "chat_messages",
  "integration_connections",
  "workdocs",
  "api_app_extensions",
];

function fail(msg) {
  console.error(`db-validate: ${msg}`);
  process.exit(1);
}

if (!existsSync(migrationsDir)) {
  fail(`missing migrations directory: ${migrationsDir}`);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

if (files.length === 0) {
  fail("no .sql migrations found under supabase/migrations");
}

const sql = files
  .map((f) => {
    const body = readFileSync(join(migrationsDir, f), "utf8");
    if (!body.trim()) fail(`empty migration: ${f}`);
    return `-- file: ${f}\n${body}`;
  })
  .join("\n");

const lower = sql.toLowerCase();

for (const table of requiredTables) {
  const create = new RegExp(
    `create\\s+table\\s+(?:if\\s+not\\s+exists\\s+)?(?:public\\.)?${table}\\b`,
    "i",
  );
  if (!create.test(sql)) {
    fail(`missing CREATE TABLE for ${table}`);
  }
  const rls = new RegExp(
    `alter\\s+table\\s+(?:if\\s+exists\\s+)?(?:public\\.)?${table}\\s+enable\\s+row\\s+level\\s+security`,
    "i",
  );
  if (!rls.test(sql)) {
    fail(`RLS not enabled for ${table}`);
  }
}

for (const helper of ["is_org_member", "has_org_role", "is_platform_staff"]) {
  if (!lower.includes(`function public.${helper}`)) {
    fail(`missing helper function public.${helper}`);
  }
}

if (!/create\s+policy\b/i.test(sql)) {
  fail("no CREATE POLICY statements found");
}

const policyCount = (sql.match(/create\s+policy\b/gi) || []).length;
if (policyCount < 10) {
  fail(`expected at least 10 policies, found ${policyCount}`);
}

console.log(`db-validate: ok (${files.length} migration(s), ${requiredTables.length} tables, ${policyCount} policies)`);
for (const f of files) console.log(`  - ${f}`);
