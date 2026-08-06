/**
 * The verdict is the one word most readers will take away, and it is computed
 * only from VERIFIED flags so nothing unproven can influence it. It must also
 * be deterministic: the same document graded twice cannot disagree with
 * itself, or the share image and the page will contradict each other.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { computeVerdict, headlineFor, severityCounts, VERDICT_PRESENTATION } from "../lib/analysis/verdict";
import { CATEGORIES, type Category, type Severity, type VerifiedFlag } from "../lib/types";

let seq = 0;
function flag(severity: Severity, category: Category = "data_sharing"): VerifiedFlag {
  const start = seq++ * 100;
  return {
    category,
    severity,
    title: `${severity} finding`,
    explanation: "First sentence. Second sentence.",
    quote: "quoted text from the document",
    start,
    end: start + 20,
  };
}

describe("computeVerdict", () => {
  test("no flags is green", () => {
    assert.equal(computeVerdict([]), "green");
  });

  test("two high-severity flags is red", () => {
    assert.equal(computeVerdict([flag("high"), flag("high")]), "red");
  });

  test("high flags spread across categories is red", () => {
    assert.equal(
      computeVerdict([flag("high", "data_sharing"), flag("high", "content_rights")]),
      "red"
    );
  });

  test("a single high flag is amber, not red", () => {
    assert.equal(computeVerdict([flag("high")]), "amber");
  });

  test("three medium flags is amber", () => {
    assert.equal(computeVerdict([flag("medium"), flag("medium"), flag("medium")]), "amber");
  });

  test("two medium flags stays green", () => {
    assert.equal(computeVerdict([flag("medium"), flag("medium")]), "green");
  });

  test("low-severity flags never escalate on their own", () => {
    const lows = Array.from({ length: 10 }, () => flag("low"));
    assert.equal(computeVerdict(lows), "green");
  });

  test("is order-independent", () => {
    const flags = [flag("low"), flag("high"), flag("medium"), flag("medium")];
    const forwards = computeVerdict(flags);
    const backwards = computeVerdict([...flags].reverse());
    assert.equal(forwards, backwards);
  });

  test("never returns not_legal — that is decided upstream, not by grading", () => {
    // not_legal means "this isn't a contract at all", which the model decides.
    // Grading flags can only ever produce green/amber/red.
    const verdicts = [[], [flag("low")], [flag("high")], [flag("high"), flag("high")]].map(
      computeVerdict
    );
    assert.ok(verdicts.every((v) => v !== ("not_legal" as string)));
  });
});

describe("headlineFor", () => {
  test("uses the singular for exactly one red flag", () => {
    const h = headlineFor("red", [flag("high"), flag("medium")], "Doc");
    assert.match(h, /1 serious red flag —/);
    assert.doesNotMatch(h, /flags/);
  });

  test("uses the plural for more than one", () => {
    assert.match(headlineFor("red", [flag("high"), flag("high")], "Doc"), /2 serious red flags/);
  });

  test("green with no flags says so plainly rather than claiming a count", () => {
    assert.equal(headlineFor("green", [], "Doc"), "No serious traps found in this document.");
  });

  test("green with minor flags reports the count", () => {
    assert.match(headlineFor("green", [flag("low")], "Doc"), /1 minor thing/);
  });

  test("not_legal names the document when a title is known", () => {
    assert.match(headlineFor("not_legal", [], "Recipe blog"), /\(Recipe blog\)/);
  });

  test("not_legal reads correctly with no title", () => {
    const h = headlineFor("not_legal", [], "");
    assert.equal(h, "This doesn't look like a terms document.");
  });

  test("always returns a non-empty string for every verdict", () => {
    for (const v of ["green", "amber", "red", "not_legal"] as const) {
      assert.ok(headlineFor(v, [flag("high")], "T").length > 0, `empty headline for ${v}`);
    }
  });
});

describe("severityCounts", () => {
  test("counts each severity independently", () => {
    const counts = severityCounts([flag("high"), flag("low"), flag("low"), flag("medium")]);
    assert.deepEqual(counts, { high: 1, medium: 1, low: 2 });
  });

  test("reports zeroes rather than omitting keys", () => {
    assert.deepEqual(severityCounts([]), { high: 0, medium: 0, low: 0 });
  });
});

describe("VERDICT_PRESENTATION", () => {
  test("covers every verdict, so no reader ever sees an unstyled result", () => {
    for (const v of ["green", "amber", "red", "not_legal"] as const) {
      const p = VERDICT_PRESENTATION[v];
      assert.ok(p, `missing presentation for ${v}`);
      assert.ok(p.label && p.note, `incomplete copy for ${v}`);
      assert.match(p.hex, /^#[0-9a-f]{6}$/i, `bad hex for ${v}`);
    }
  });

  test("gives each verdict a distinct colour and label", () => {
    const all = Object.values(VERDICT_PRESENTATION);
    assert.equal(new Set(all.map((p) => p.hex)).size, all.length);
    assert.equal(new Set(all.map((p) => p.label)).size, all.length);
  });
});

describe("categories", () => {
  test("the three risk categories are the ones the product promises", () => {
    assert.deepEqual([...CATEGORIES], [
      "data_sharing",
      "auto_renewal_cancellation",
      "content_rights",
    ]);
  });
});
