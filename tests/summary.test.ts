/**
 * The summary is what gets copied out of the app and pasted elsewhere, so it
 * has to stand on its own without over-claiming. The rule the code earned the
 * hard way: never pad the list to a fixed length with facts about the tool,
 * because padding reads as findings and inflates how bad a document looks.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { buildSummary, copyText, QUOTE_GUARANTEE } from "../lib/analysis/summary";
import { DISCLAIMER, type Category, type Severity, type VerifiedFlag } from "../lib/types";

let seq = 0;
function flag(
  severity: Severity,
  category: Category,
  title = `${severity} ${category}`,
  explanation = "The important bit. A trailing sentence that should be dropped."
): VerifiedFlag {
  const start = seq++ * 100;
  return { category, severity, title, explanation, quote: "q".repeat(30), start, end: start + 30 };
}

describe("buildSummary", () => {
  test("never returns more than five bullets", () => {
    const many = Array.from({ length: 12 }, () => flag("high", "data_sharing"));
    assert.equal(buildSummary(many).length, 5);
  });

  test("orders findings by severity, worst first", () => {
    const bullets = buildSummary([
      flag("low", "data_sharing", "low one"),
      flag("high", "content_rights", "high one"),
      flag("medium", "auto_renewal_cancellation", "medium one"),
    ]);
    assert.match(bullets[0], /^high one/);
    assert.match(bullets[1], /^medium one/);
    assert.match(bullets[2], /^low one/);
  });

  test("uses only the first sentence of an explanation", () => {
    const [bullet] = buildSummary([flag("high", "data_sharing", "Title")]);
    assert.equal(bullet, "Title — The important bit.");
    assert.doesNotMatch(bullet, /trailing sentence/);
  });

  test("reports a clean bill for categories with no findings", () => {
    const bullets = buildSummary([flag("high", "data_sharing", "Shares your data")]);
    const joined = bullets.join("\n");
    assert.match(joined, /No auto-renewal or cancellation traps found\./);
    assert.match(joined, /No grabs on your own content found\./);
    assert.doesNotMatch(joined, /No hidden data-sharing found\./);
  });

  test("a clean document reports all three categories clear", () => {
    const bullets = buildSummary([]);
    assert.equal(bullets.length, 3);
    assert.ok(bullets.every((b) => /^No /.test(b)));
  });

  test("does not pad findings with facts about the tool", () => {
    const bullets = buildSummary([
      flag("high", "data_sharing"),
      flag("high", "auto_renewal_cancellation"),
      flag("high", "content_rights"),
    ]);
    const joined = bullets.join("\n");
    assert.doesNotMatch(joined, /characters|word for word|verbatim/i);
    assert.equal(bullets.length, 3, "three findings should give three bullets, not five");
  });

  test("does not mutate the caller's array", () => {
    const flags = [flag("low", "data_sharing"), flag("high", "content_rights")];
    const before = flags.map((f) => f.severity);
    buildSummary(flags);
    assert.deepEqual(flags.map((f) => f.severity), before);
  });
});

describe("copyText", () => {
  test("carries the headline, the bullets, the guarantee and the disclaimer", () => {
    const text = copyText("2 serious red flags.", ["First — a.", "Second — b."]);
    assert.match(text, /^2 serious red flags\./);
    assert.match(text, /• First — a\./);
    assert.match(text, /• Second — b\./);
    assert.ok(text.includes(QUOTE_GUARANTEE));
    assert.ok(text.includes(DISCLAIMER));
  });

  test("attributes the analysis so a pasted summary is never anonymous", () => {
    assert.match(copyText("h", []), /via I AGREE/);
  });
});
