/**
 * `extractFromUrl` fetches an address supplied by an anonymous visitor, so its
 * guards are a security boundary rather than input tidying. These tests cover
 * the parts that reach a decision before any network call happens: what counts
 * as a private host, and which URLs are refused outright.
 *
 * Nothing here touches the network. Tests that depend on a remote site being
 * up are not tests, they are a status page.
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { extractFromUrl, isPrivateHost, ExtractError } from "../lib/documents/extract";

describe("isPrivateHost — addresses that must never be fetched", () => {
  const privateHosts = [
    "localhost",
    "api.localhost",
    "printer.local",
    "db.internal",
    "127.0.0.1",
    "127.1.2.3",
    "10.0.0.1",
    "10.255.255.255",
    "192.168.1.1",
    "169.254.169.254", // cloud instance metadata — the classic SSRF target
    "0.0.0.0",
    "100.64.0.1", // carrier-grade NAT
    "[::1]",
    "[::]",
    "[fc00::1]", // unique-local
    "[fd12:3456::1]",
    "[fe80::1]", // link-local
    "[::ffff:10.0.0.1]", // IPv4-mapped private address
  ];

  for (const host of privateHosts) {
    test(`blocks ${host}`, () => {
      assert.equal(isPrivateHost(host), true);
    });
  }

  test("blocks the whole 172.16.0.0/12 range", () => {
    for (let second = 16; second <= 31; second++) {
      assert.equal(isPrivateHost(`172.${second}.0.1`), true, `172.${second}.0.1 should be blocked`);
    }
  });
});

describe("isPrivateHost — addresses that are legitimately public", () => {
  const publicHosts = [
    "example.com",
    "policies.google.com",
    "foundation.wikimedia.org",
    "8.8.8.8",
    "1.1.1.1",
    "172.15.0.1", // just below the private block
    "172.32.0.1", // just above it
    "192.169.0.1", // one off from 192.168
    "100.63.0.1", // just below carrier-grade NAT
    "100.128.0.1", // just above it
    "11.0.0.1",
    "[2606:4700::1111]", // public IPv6
    "localhost.example.com", // a real domain that merely starts with the word
  ];

  for (const host of publicHosts) {
    test(`allows ${host}`, () => {
      assert.equal(isPrivateHost(host), false);
    });
  }
});

describe("extractFromUrl — refusals that happen before any request", () => {
  async function refusal(url: string): Promise<string> {
    try {
      await extractFromUrl(url);
      throw new Error(`expected ${url} to be refused`);
    } catch (e) {
      assert.ok(e instanceof ExtractError, `expected an ExtractError, got ${e}`);
      return e.message;
    }
  }

  test("rejects text that is not a URL at all", async () => {
    assert.match(await refusal("not a link"), /valid link/i);
  });

  test("rejects an empty string", async () => {
    assert.match(await refusal("   "), /valid link/i);
  });

  test("rejects non-http schemes", async () => {
    for (const url of ["file:///etc/passwd", "ftp://example.com/x", "gopher://example.com"]) {
      assert.match(await refusal(url), /public http/i);
    }
  });

  test("rejects a javascript: URL", async () => {
    assert.match(await refusal("javascript:alert(1)"), /public http/i);
  });

  test("rejects private addresses", async () => {
    for (const url of [
      "http://localhost:3000/admin",
      "http://169.254.169.254/latest/meta-data/",
      "http://172.16.0.1/",
      "http://[fc00::1]/",
    ]) {
      assert.match(await refusal(url), /public http/i);
    }
  });

  test("refuses with a message safe to show a user", async () => {
    // No internal paths, hostnames or stack detail leaked back to the client.
    const message = await refusal("http://10.0.0.5/secret-admin-panel");
    assert.doesNotMatch(message, /10\.0\.0\.5|secret-admin-panel/);
  });
});
