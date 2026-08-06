/**
 * The verification layer is the product's entire claim: a warning is only ever
 * shown if its quote was found verbatim in the source document. These tests
 * therefore pull in two directions on purpose.
 *
 * Half of them insist a real quote is still found when the model reformats it
 * — curly quotes, an em dash, collapsed whitespace, added punctuation. A
 * matcher too strict to survive that would silently withhold true findings.
 *
 * The other half insist an invented quote is NOT found. That is the direction
 * that matters: a false positive here puts a fabricated clause in front of a
 * reader with the app's word behind it.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { normalizeWithMap, findQuoteInOriginal } from "../lib/analysis/verification";

const DOC = `ACME CLOUD — TERMS OF SERVICE

1. Content Licence. By uploading content you grant Acme a perpetual, irrevocable,
worldwide, royalty-free licence to reproduce, modify, publish and create derivative
works from that content for any purpose, without compensation to you.

2. Data. We share your personal information, device identifiers and precise location
data with advertising partners and analytics providers.

3. Renewal. Your subscription renews automatically for successive one-year terms at
the then-current rate unless you cancel in writing at least thirty days before the
renewal date.`;

const doc = normalizeWithMap(DOC);

/** What the reader would actually see highlighted for a given match. */
function highlighted(quote: string) {
  const m = findQuoteInOriginal(quote, doc, DOC);
  return m.verified ? DOC.slice(m.start, m.end) : null;
}

describe("normalizeWithMap", () => {
  test("collapses whitespace and lowercases", () => {
    const { norm } = normalizeWithMap("  Hello   \n\n WORLD  ");
    assert.equal(norm, "hello world");
  });

  test("drops punctuation but keeps word separation", () => {
    const { norm } = normalizeWithMap("Yes, really: it's true!");
    assert.equal(norm, "yes really its true");
  });

  test("every normalised char maps back to a real index in the original", () => {
    const original = "  A—B, c’d  ";
    const { norm, map } = normalizeWithMap(original);
    assert.equal(norm.length, map.length, "map must be parallel to norm");
    for (const i of map) {
      assert.ok(i >= 0 && i < original.length, `index ${i} out of range`);
    }
  });

  test("indices are non-decreasing, so highlights can never run backwards", () => {
    const { map } = normalizeWithMap(DOC);
    for (let i = 1; i < map.length; i++) {
      assert.ok(map[i] >= map[i - 1], `map went backwards at ${i}`);
    }
  });
});

describe("findQuoteInOriginal — quotes that are really there", () => {
  test("finds an exact quote and returns offsets into the ORIGINAL text", () => {
    const quote = "perpetual, irrevocable, worldwide, royalty-free licence";
    const shown = highlighted(quote);
    assert.ok(shown, "should verify");
    assert.match(shown, /perpetual/);
    assert.match(shown, /royalty-free licence/);
  });

  test("survives the line wrapping the model strips out", () => {
    // In DOC this phrase is broken across a newline; the model returns it flat.
    assert.ok(highlighted("irrevocable, worldwide, royalty-free licence to reproduce"));
  });

  test("tolerates curly quotes, em dashes and ellipses", () => {
    assert.ok(highlighted("ACME CLOUD – TERMS OF SERVICE"));
    assert.ok(highlighted("unless you cancel in writing at least thirty days"));
  });

  test("tolerates differing punctuation and casing", () => {
    assert.ok(highlighted("WE SHARE YOUR PERSONAL INFORMATION -- device identifiers"));
  });

  test("extends the highlight over trailing punctuation so it reads naturally", () => {
    const shown = highlighted("before the renewal date");
    assert.ok(shown);
    assert.ok(shown.endsWith("."), `expected trailing period, got ${JSON.stringify(shown)}`);
  });

  test("recovers a quote the model clipped at both ends", () => {
    // The trimmed-core ladder: first and last 10 normalised chars discarded.
    const clipped = "XXXXXXXXXX share your personal information, device identifiers and precise location data with advertising partnersYYYYYYYYYY";
    assert.ok(findQuoteInOriginal(clipped, doc, DOC).verified);
  });

  test("falls back to the longest sentence when a multi-sentence quote drifts", () => {
    const drifted =
      "Something the document never said at all. Your subscription renews automatically for successive one-year terms at the then-current rate.";
    assert.ok(findQuoteInOriginal(drifted, doc, DOC).verified);
  });
});

describe("findQuoteInOriginal — quotes that are not there", () => {
  test("rejects a fabricated clause outright", () => {
    const invented =
      "Acme may enter your home at any time and remove hardware without notice or compensation.";
    assert.equal(findQuoteInOriginal(invented, doc, DOC).verified, false);
  });

  test("rejects a quote that is real except for an inserted negation", () => {
    // The dangerous near-miss: one word flips the meaning of a true clause.
    const negated = "you do not grant Acme a perpetual, irrevocable, worldwide licence";
    assert.equal(findQuoteInOriginal(negated, doc, DOC).verified, false);
  });

  test("rejects quotes too short to be evidence", () => {
    assert.equal(findQuoteInOriginal("Data.", doc, DOC).verified, false);
    assert.equal(findQuoteInOriginal("", doc, DOC).verified, false);
  });

  test("an unverified result carries no offsets to render", () => {
    const m = findQuoteInOriginal("nothing like this appears in the document", doc, DOC);
    assert.deepEqual(
      { verified: m.verified, start: m.start, end: m.end, exactQuote: m.exactQuote },
      { verified: false, start: 0, end: 0, exactQuote: "" }
    );
  });
});

describe("offsets are safe to slice", () => {
  test("every verified match yields a non-empty in-bounds slice", () => {
    const quotes = [
      "perpetual, irrevocable, worldwide, royalty-free licence",
      "device identifiers and precise location data",
      "renews automatically for successive one-year terms",
    ];
    for (const q of quotes) {
      const m = findQuoteInOriginal(q, doc, DOC);
      assert.ok(m.verified, `expected to verify: ${q}`);
      assert.ok(m.start >= 0 && m.end <= DOC.length, `out of bounds for: ${q}`);
      assert.ok(m.end > m.start, `empty range for: ${q}`);
      assert.equal(DOC.slice(m.start, m.end), m.exactQuote);
    }
  });
});
