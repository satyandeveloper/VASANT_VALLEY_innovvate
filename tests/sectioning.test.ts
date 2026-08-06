/**
 * Sectioning exists so a 200,000-character contract can be analysed at all.
 * The property that actually matters is coverage: if the seam between two
 * sections falls inside a clause, that clause is analysed by neither call and
 * a real risk goes unreported. Overlap is what prevents it, so these tests
 * check the seams rather than the section count.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { splitIntoSections, mapWithConcurrency } from "../lib/analysis/sectioning";

/** Prose long enough to force splitting, with real paragraph boundaries. */
function longDocument(paragraphs: number): string {
  return Array.from(
    { length: paragraphs },
    (_, i) =>
      `Clause ${i}. ${"The parties agree to the following terms and conditions. ".repeat(12)}`
  ).join("\n\n");
}

describe("splitIntoSections", () => {
  test("leaves a short document as a single section", () => {
    const text = "A short set of terms.";
    assert.deepEqual(splitIntoSections(text), [text]);
  });

  test("does not split a document just under the single-call limit", () => {
    assert.equal(splitIntoSections("x".repeat(28_000)).length, 1);
  });

  test("splits a document beyond the limit", () => {
    const text = longDocument(400);
    assert.ok(text.length > 28_000, "fixture must be long enough to split");
    assert.ok(splitIntoSections(text).length > 1);
  });

  test("every character of the document appears in some section", () => {
    const text = longDocument(400);
    const sections = splitIntoSections(text);
    // Sections are contiguous-with-overlap, so concatenating in order must
    // cover the original: check each section is a real substring and that
    // together they reach the end.
    let reached = 0;
    for (const s of sections) {
      const at = text.indexOf(s, Math.max(0, reached - s.length));
      assert.notEqual(at, -1, "section is not a substring of the document");
      reached = Math.max(reached, at + s.length);
    }
    assert.equal(reached, text.length, "sections did not cover the whole document");
  });

  test("consecutive sections overlap, so no clause falls through a seam", () => {
    const text = longDocument(400);
    const sections = splitIntoSections(text);
    assert.ok(sections.length > 1);
    for (let i = 1; i < sections.length; i++) {
      const previousTail = sections[i - 1].slice(-200);
      const current = sections[i];
      assert.ok(
        current.includes(previousTail.slice(-50)),
        `section ${i} does not overlap section ${i - 1}`
      );
    }
  });

  test("terminates on pathological input with no sentence or paragraph breaks", () => {
    const sections = splitIntoSections("x".repeat(120_000));
    assert.ok(sections.length > 1);
    assert.ok(sections.every((s) => s.length > 0), "empty section would waste a model call");
  });

  test("handles the maximum accepted document size", () => {
    const sections = splitIntoSections(longDocument(3000).slice(0, 200_000));
    assert.ok(sections.length > 1);
    assert.ok(sections.every((s) => s.length <= 28_000));
  });
});

describe("mapWithConcurrency", () => {
  test("returns results in input order regardless of completion order", async () => {
    const input = [40, 5, 30, 1, 20];
    const out = await mapWithConcurrency(input, 3, async (ms) => {
      await new Promise((r) => setTimeout(r, ms));
      return ms;
    });
    assert.deepEqual(out, input);
  });

  test("never exceeds the concurrency limit", async () => {
    let inFlight = 0;
    let peak = 0;
    await mapWithConcurrency(Array.from({ length: 20 }, (_, i) => i), 4, async () => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return null;
    });
    assert.ok(peak <= 4, `ran ${peak} at once with a limit of 4`);
  });

  test("passes the index alongside each item", async () => {
    const seen = await mapWithConcurrency(["a", "b", "c"], 2, async (item, i) => `${i}:${item}`);
    assert.deepEqual(seen, ["0:a", "1:b", "2:c"]);
  });

  test("handles an empty list without hanging", async () => {
    assert.deepEqual(await mapWithConcurrency([], 4, async () => 1), []);
  });

  test("a limit larger than the list is harmless", async () => {
    assert.deepEqual(await mapWithConcurrency([1, 2], 99, async (n) => n * 2), [2, 4]);
  });
});
