/**
 * One-off: analyse the three credited public sample documents and store them
 * in the cache marked `is_sample`, so the demo chips never depend on a live
 * AI call. Run after setting env vars:  npx tsx scripts/seed-samples.ts
 *
 * Put the three documents in scripts/samples/ as .txt files with a first line
 * of the form "TITLE | SOURCE_URL" followed by the document text.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readdirSync, readFileSync } from "fs";
import { join } from "path";

async function main() {
  const { runAnalysis } = await import("../lib/pipeline");
  const dir = join(__dirname, "samples");
  const files = readdirSync(dir).filter((f) => f.endsWith(".txt"));
  if (files.length === 0) {
    console.error("No .txt files in scripts/samples/ — add the three sample documents first.");
    process.exit(1);
  }
  for (const file of files) {
    const raw = readFileSync(join(dir, file), "utf8");
    const newline = raw.indexOf("\n");
    const header = raw.slice(0, newline);
    const [title, sourceUrl] = header.split("|").map((s) => s.trim());
    const text = raw.slice(newline + 1).trim();
    console.log(`Analysing ${file} (“${title}”, ${text.length} chars)…`);
    const analysis = await runAnalysis({
      text,
      sourceType: "sample",
      sourceUrl: sourceUrl || null,
      titleHint: title || null,
    });
    console.log(
      `  → ${analysis.verdict.toUpperCase()} | ${analysis.flags.length} verified flags | id: ${analysis.id}`
    );
  }
  console.log("Done. Sample chips will now appear on the home page.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
