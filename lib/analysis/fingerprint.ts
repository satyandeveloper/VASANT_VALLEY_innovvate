import { createHash } from "crypto";

/**
 * Normalised fingerprint: the same document produces the same hash however it
 * arrives (pasted with different line-wrapping, fetched from a URL, re-pasted).
 */
export function fingerprint(text: string): string {
  const normalized = text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[​-‍﻿]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return createHash("sha256").update(normalized).digest("hex");
}
