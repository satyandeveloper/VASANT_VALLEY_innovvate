import OpenAI from "openai";
import type { SectionResult } from "./types";

export const MODEL = "gpt-4o-mini";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set");
  }
  _client ??= new OpenAI();
  return _client;
}

const SYSTEM_PROMPT = `You are the analysis engine of "I AGREE", a tool that decodes legal documents (terms of service, privacy policies, rental agreements) for ordinary people.

Examine the provided document for EXACTLY three kinds of risk, and nothing else:
1. data_sharing — personal data being collected, shared, sold, or used beyond what a user would expect.
2. auto_renewal_cancellation — automatic renewal, difficult cancellation, hidden fees on exit.
3. content_rights — rights the service takes over content the user creates or uploads.

For each risk you find, produce a flag with:
- category: one of the three above.
- severity: "high" (irreversible or very broad rights, hard traps), "medium" (notable but bounded), "low" (standard but worth knowing).
- title: a short plain-language name for the problem (max ~8 words).
- explanation: 1–2 sentences a 12-year-old understands. No jargon.
- quote: a contiguous VERBATIM excerpt copied character-for-character from the provided text, 1–2 sentences long. NEVER paraphrase, shorten words, fix typos, or stitch together text from different places. Copy it exactly as written, or the flag will be rejected.

Rules:
- 0 to 4 flags per category. Only flag what the text actually says.
- If the text is not a legal/terms/policy/agreement document (e.g. a recipe, an article, random text), set is_legal_document to false and return zero flags.
- suggested_title: a short human name for the document, e.g. "ExampleApp Terms of Service".
- document_type: e.g. "terms_of_service", "privacy_policy", "rental_agreement", "other".`;

const ANALYSIS_SCHEMA = {
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

export async function analyzeSection(sectionText: string): Promise<SectionResult> {
  const response = await client().chat.completions.create(
    {
      model: MODEL,
      temperature: 0,
      max_tokens: 4096,
      response_format: {
        type: "json_schema",
        json_schema: { name: "analysis", strict: true, schema: ANALYSIS_SCHEMA },
      },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: sectionText },
      ],
    },
    { signal: AbortSignal.timeout(45_000) }
  );

  const message = response.choices[0]?.message;
  if (!message || message.refusal || !message.content) {
    throw new Error("The analysis engine returned no result. Please retry.");
  }
  return JSON.parse(message.content) as SectionResult;
}
