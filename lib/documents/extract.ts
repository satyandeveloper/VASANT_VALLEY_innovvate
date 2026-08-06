const FRIENDLY_ERROR =
  "That site wouldn't let us read the page — paste the text instead.";

const MAX_BYTES = 2 * 1024 * 1024;

export class ExtractError extends Error {}

/**
 * Reject hosts that live inside the network the server is running in.
 *
 * This endpoint fetches a URL chosen by an anonymous visitor, which makes it a
 * server-side request forgery surface: without a guard, "analyse this link"
 * becomes "make my server GET this address for me", and the interesting
 * addresses are the ones only the server can reach — cloud metadata services,
 * internal admin panels, databases bound to a private interface.
 *
 * The previous check was a prefix regex that missed the 172.16.0.0/12 block
 * entirely (a very common private range) and every IPv6 private address, so
 * http://172.16.0.1/ and http://[fc00::1]/ both sailed through.
 *
 * Known limits, stated rather than implied: this inspects the literal host
 * only. A public hostname whose DNS record points at a private address still
 * resolves and is still fetched, and a record that changes between this check
 * and the request (DNS rebinding) is not caught either. Closing those needs
 * resolution-time pinning, which Node's fetch does not expose. This raises the
 * floor; it is not an isolation boundary.
 */
export function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  // Names that only ever mean "this machine" or "this LAN".
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;

  // IPv6 arrives from URL.hostname wrapped in brackets.
  if (host.startsWith("[") && host.endsWith("]")) {
    const ip = host.slice(1, -1);
    if (ip === "::1" || ip === "::") return true;
    // Unique-local fc00::/7 and link-local fe80::/10.
    if (/^f[cd][0-9a-f]{0,2}:/.test(ip)) return true;
    if (/^fe[89ab][0-9a-f]?:/.test(ip)) return true;
    // ::ffff:10.0.0.1 — an IPv4 private address wearing an IPv6 hat.
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateHost(mapped[1]);
    return false;
  }

  const octets = host.split(".");
  if (octets.length !== 4) return false; // a normal domain name
  const [a, b] = octets.map(Number);
  if (octets.some((o) => !/^\d{1,3}$/.test(o)) || [a, b].some(Number.isNaN)) return false;

  if (a === 0) return true; // "this network"
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // carrier-grade NAT
  return false;
}

/** Fetch a URL and extract its readable text server-side. */
export async function extractFromUrl(
  rawUrl: string
): Promise<{ text: string; title: string }> {
  let url: URL;
  try {
    url = new URL(rawUrl.trim());
  } catch {
    throw new ExtractError("That doesn't look like a valid link.");
  }
  if (!/^https?:$/.test(url.protocol) || isPrivateHost(url.hostname)) {
    throw new ExtractError("Only public http(s) links are supported.");
  }

  let res: Response;
  try {
    res = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (compatible; IAgreeBot/1.0)",
        Accept: "text/html,application/xhtml+xml",
      },
      redirect: "follow",
      signal: AbortSignal.timeout(8_000),
    });
  } catch {
    throw new ExtractError(FRIENDLY_ERROR);
  }
  if (!res.ok) throw new ExtractError(FRIENDLY_ERROR);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("text/html") && !contentType.includes("text/plain")) {
    throw new ExtractError(FRIENDLY_ERROR);
  }

  const buf = await res.arrayBuffer();
  if (buf.byteLength > MAX_BYTES) throw new ExtractError(FRIENDLY_ERROR);
  const html = new TextDecoder().decode(buf);

  if (contentType.includes("text/plain")) {
    return { text: html.trim(), title: url.hostname };
  }

  // linkedom rather than jsdom, and the difference is not preference.
  //
  // jsdom sits on Next's default serverExternalPackages list, so it is not
  // bundled — the serverless runtime require()s it natively. Its dependency
  // tree now carries several ESM-only packages (@exodus/bytes via
  // html-encoding-sniffer, @csstools/* via @asamuzakjp/css-color), and a CJS
  // require() of those throws ERR_REQUIRE_ESM. Every HTML link failed in
  // production with "that site wouldn't let us read the page" while working
  // locally, because a bundler resolves those imports and the external loader
  // cannot. Pinning around one offender only surfaced the next.
  //
  // linkedom is not on that list, so it is bundled like any other dependency
  // and the whole class of failure goes away. It is also a far lighter parser,
  // which a function that only wants text out of a page should prefer anyway.
  const [{ parseHTML }, { Readability }] = await Promise.all([
    import("linkedom"),
    import("@mozilla/readability"),
  ]);

  try {
    const { document } = parseHTML(html);
    const article = new Readability(document as never).parse();
    let text = article?.textContent?.trim() ?? "";
    let title = article?.title || document.title || url.hostname;
    if (text.length < 300) {
      // Readability gave up — fall back to stripped body text
      for (const el of [
        ...document.querySelectorAll("script,style,nav,header,footer,noscript"),
      ]) {
        el.remove();
      }
      text = (document.body?.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
      title = document.title || url.hostname;
    }
    if (text.length < 300) throw new ExtractError(FRIENDLY_ERROR);
    return { text, title };
  } catch (e) {
    if (e instanceof ExtractError) throw e;
    throw new ExtractError(FRIENDLY_ERROR);
  }
}
