#!/usr/bin/env node
/**
 * Fails when api/ holds more serverless functions than the hosting plan
 * allows.
 *
 * Vercel's Hobby plan deploys at most 12 functions. When a 13th file was
 * added in September 2026, every deployment failed for two weeks and the
 * live site silently stayed on an old version. This check runs before every
 * build and in CI, so the same mistake now stops with a clear message.
 *
 * Every file under api/ counts as one function, except files and folders
 * whose name starts with "_" or "." (shared helpers go in api/_lib/).
 */
import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const MAX_FUNCTIONS = 12;
const apiDir = fileURLToPath(new URL("../api", import.meta.url));

const findFunctions = (dir) =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith("_") || entry.name.startsWith(".")) return [];
    const full = join(dir, entry.name);
    if (entry.isDirectory()) return findFunctions(full);
    if (entry.name.endsWith(".d.ts")) return [];
    return /\.(ts|js|mjs|cjs)$/.test(entry.name) ? [relative(apiDir, full)] : [];
  });

const functions = findFunctions(apiDir).sort();

if (functions.length > MAX_FUNCTIONS) {
  console.error(
    `\nToo many serverless functions: ${functions.length} files in api/, but the plan allows ${MAX_FUNCTIONS}.\n` +
      `Vercel will refuse to deploy. Merge two routes, or move shared code into api/_lib/.\n\n` +
      functions.map((name) => `  api/${name}`).join("\n") +
      "\n",
  );
  process.exit(1);
}

console.log(`Serverless functions: ${functions.length} of ${MAX_FUNCTIONS} allowed.`);
