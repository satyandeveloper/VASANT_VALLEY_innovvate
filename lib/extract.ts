const FRIENDLY_ERROR =
  "That site wouldn't let us read the page — paste the text instead.";

const BLOCKED_HOSTS = /^(localhost|127\.|10\.|192\.168\.|169\.254\.|0\.|\[::1\])/i;
const MAX_BYTES = 2 * 1024 * 1024;

export class ExtractError extends Error {}

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
  if (!/^https?:$/.test(url.protocol) || BLOCKED_HOSTS.test(url.hostname)) {
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

  // Lazy imports keep jsdom out of every other serverless function bundle.
  const [{ JSDOM }, { Readability }] = await Promise.all([
    import("jsdom"),
    import("@mozilla/readability"),
  ]);

  try {
    const dom = new JSDOM(html, { url: url.href });
    const article = new Readability(dom.window.document).parse();
    let text = article?.textContent?.trim() ?? "";
    let title = article?.title || dom.window.document.title || url.hostname;
    if (text.length < 300) {
      // Readability gave up — fall back to stripped body text
      const doc = dom.window.document;
      doc.querySelectorAll("script,style,nav,header,footer,noscript").forEach((el) =>
        el.remove()
      );
      text = (doc.body?.textContent ?? "").replace(/\n{3,}/g, "\n\n").trim();
      title = doc.title || url.hostname;
    }
    if (text.length < 300) throw new ExtractError(FRIENDLY_ERROR);
    return { text, title };
  } catch (e) {
    if (e instanceof ExtractError) throw e;
    throw new ExtractError(FRIENDLY_ERROR);
  }
}
