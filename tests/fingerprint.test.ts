/**
 * The fingerprint is what makes the cache correct. Two rules matter:
 * documents that are the same in substance must collide (or every re-paste
 * pays for another model call), and documents that differ in substance must
 * not (or a reader is shown an analysis of somebody else's contract).
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { fingerprint } from "../lib/analysis/fingerprint";

describe("fingerprint — same document, different arrival", () => {
  test("ignores line wrapping and repeated whitespace", () => {
    assert.equal(
      fingerprint("The quick brown fox\njumps over the lazy dog"),
      fingerprint("The quick brown   fox jumps over\n\n the lazy dog")
    );
  });

  test("ignores case", () => {
    assert.equal(fingerprint("Terms Of Service"), fingerprint("terms of service"));
  });

  test("ignores leading and trailing whitespace", () => {
    assert.equal(fingerprint("  contract  "), fingerprint("contract"));
  });

  test("ignores zero-width characters pasted in from a web page", () => {
    assert.equal(fingerprint("a​b‌c﻿"), fingerprint("abc"));
  });

  test("treats compatibility-equivalent characters as equal (NFKC)", () => {
    // A ligature pasted out of a PDF against the same words typed plainly.
    assert.equal(fingerprint("ﬁnal offer"), fingerprint("final offer"));
  });
});

describe("fingerprint — different documents", () => {
  test("differs when a single word changes", () => {
    assert.notEqual(
      fingerprint("You may cancel at any time"),
      fingerprint("You may not cancel at any time")
    );
  });

  test("differs when word order changes", () => {
    assert.notEqual(fingerprint("data sharing"), fingerprint("sharing data"));
  });
});

describe("fingerprint — shape", () => {
  test("is a 64-character hex sha256 digest", () => {
    assert.match(fingerprint("anything"), /^[0-9a-f]{64}$/);
  });

  test("is stable across calls", () => {
    assert.equal(fingerprint("stable"), fingerprint("stable"));
  });
});
