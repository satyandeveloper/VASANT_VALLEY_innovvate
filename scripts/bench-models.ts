/**
 * Model bench for the analysis step.
 *
 * Accuracy here is not a vibe check. Every flag the model emits must carry a
 * VERBATIM quote from the source, and the app already rejects any flag whose
 * quote cannot be found — so the share of quotes that fail verification is a
 * direct, objective hallucination rate for this exact task.
 *
 * Usage: npx tsx scripts/bench-models.ts [sample-file]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { readFileSync } from "node:fs";
import OpenAI from "openai";
import { normalizeWithMap, findQuoteInOriginal } from "../lib/verification";

const MODELS = [
  { id: "gpt-4o-mini", reasoning: false },
  { id: "gpt-4.1-nano", reasoning: false },
  { id: "gpt-4.1-mini", reasoning: false },
  { id: "gpt-5-nano", reasoning: true },
  { id: "gpt-5-mini", reasoning: true },
  { id: "gpt-5.4-nano", reasoning: true },
  { id: "gpt-5.4-mini", reasoning: true },
  { id: "gpt-5.6-luna", reasoning: true },
];

const SYSTEM_PROMPT = readFileSync("lib/openai.ts", "utf8").match(
  /const SYSTEM_PROMPT = `([\s\S]*?)`;/
)![1];

const SCHEMA = {
  type: "object",
  properties: {
    is_legal_document: { type: "boolean" },
    document_type: { type: "string" },
    suggested_title: { type: "string" },
    flags: {
      type: "array",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["data_sharing", "auto_renewal_cancellation", "content_rights"],
          },
          severity: { type: "string", enum: ["high", "medium", "low"] },
          title: { type: "string" },
          explanation: { type: "string" },
          quote: { type: "string" },
        },
        required: ["category", "severity", "title", "explanation", "quote"],
        additionalProperties: false,
      },
    },
  },
  required: ["is_legal_document", "document_type", "suggested_title", "flags"],
  additionalProperties: false,
} as const;

const file = process.argv[2] ?? "scripts/samples/3-residential-lease.txt";
const doc = readFileSync(file, "utf8");
const normDoc = normalizeWithMap(doc);
const openai = new OpenAI();

async function run(m: (typeof MODELS)[number]) {
  const started = Date.now();
  const res = await openai.chat.completions.create(
    {
      model: m.id,
      ...(m.reasoning
        ? { max_completion_tokens: 12_000, reasoning_effort: "low" as const }
        : { temperature: 0, max_tokens: 4096 }),
      response_format: {
        type: "json_schema",
        json_schema: { name: "analysis", strict: true, schema: SCHEMA },
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: doc },
      ],
    },
    { signal: AbortSignal.timeout(180_000) }
  );

  const seconds = (Date.now() - started) / 1000;
  const u = res.usage!;
  const content = res.choices[0]?.message?.content;
  if (res.choices[0]?.finish_reason === "length") throw new Error("ran out of output budget");
  if (!content) throw new Error("empty response");

  const parsed = JSON.parse(content);
  const flags = parsed.flags ?? [];
  const verified = flags.filter(
    (f: { quote: string }) => findQuoteInOriginal(f.quote, normDoc, doc).verified
  ).length;

  return {
    model: m.id,
    seconds,
    inTok: u.prompt_tokens,
    outTok: u.completion_tokens,
    reasonTok: u.completion_tokens_details?.reasoning_tokens ?? 0,
    flags: flags.length,
    verified,
    categories: new Set(flags.map((f: { category: string }) => f.category)).size,
  };
}

async function main() {
  const rows: Awaited<ReturnType<typeof run>>[] = [];
  for (const m of MODELS) {
    try {
      const r = await run(m);
      rows.push(r);
      console.log(
        `${r.model.padEnd(14)} ${String(r.seconds.toFixed(1)).padStart(6)}s  ` +
          `in ${String(r.inTok).padStart(6)}  out ${String(r.outTok).padStart(5)} ` +
          `(reasoning ${String(r.reasonTok).padStart(5)})  ` +
          `flags ${r.flags}  verified ${r.verified}/${r.flags}  cats ${r.categories}/3`
      );
    } catch (e) {
      console.log(`${m.id.padEnd(14)} FAILED: ${(e as Error).message.slice(0, 110)}`);
    }
  }
  console.log("\nJSON:\n" + JSON.stringify(rows, null, 2));
}

main();
