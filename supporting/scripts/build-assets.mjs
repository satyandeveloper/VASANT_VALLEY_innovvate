/**
 * Build the packet's static assets:
 *   assets/prototype.png        a sharp screenshot of a real analysis
 *   assets/i-agree-slides.pdf   the three slides, one per landscape page
 *   assets/poster.png           the video poster frame
 *
 * The print page is generated from index.html rather than duplicated, so the
 * PDF can never drift from the slides on the page.
 */
import { chromium } from "playwright";
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SITE = `${ROOT}/site`;
const OUT = `${SITE}/assets`;
mkdirSync(OUT, { recursive: true });

const DOC = `ACME CLOUD — TERMS OF SERVICE

1. Content Licence. By uploading content you grant Acme a perpetual, irrevocable, worldwide, royalty-free licence to reproduce, modify, publish and create derivative works from that content for any purpose, without compensation to you.

2. Data. We share your personal information, device identifiers and precise location data with advertising partners and analytics providers, and with any successor entity in the event of a merger or sale of assets.

3. Renewal. Your subscription renews automatically for successive one-year terms at the then-current rate unless you cancel in writing at least thirty days before the renewal date. Fees already charged are non-refundable.`;

const browser = await chromium.launch({ channel: "chrome" });

/* ---------------------------------------------- 1. prototype screenshot */
{
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 980 },
    deviceScaleFactor: 2,
  });
  const page = await ctx.newPage();
  await page.goto("https://innovvate.devjindal.me", { waitUntil: "networkidle" });
  await page.locator("#doc").fill(DOC);
  await page.getByRole("button", { name: /decode it/i }).click();
  await page.waitForSelector("text=/red flags|read carefully|looks fair|not a contract/i", {
    timeout: 90_000,
  });
  await page.waitForTimeout(1500);
  // Frame the results, which is where the product's claim is visible.
  await page.evaluate(() => {
    const el = document.querySelector("h3");
    if (el) el.scrollIntoView({ block: "center" });
  });
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/prototype.png` });
  console.log("✓ prototype.png");
  await ctx.close();
}

/* ------------------------------------------------------ 2. slides PDF */
{
  const html = readFileSync(`${SITE}/index.html`, "utf8");
  const deck = html.match(/<div class="deck">([\s\S]*?)<\/div>\s*<p class="label deck-hint"/);
  if (!deck) throw new Error("could not locate the deck in index.html");

  const print = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=Courier+Prime:wght@400;700&family=Newsreader:opsz,wght@6..72,400;6..72,500;6..72,600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="./styles.css">
<style>
  @page { size: 1600px 900px; margin: 0; }
  body { background: #fff; }
  .page { width: 1600px; height: 900px; display: flex; page-break-after: always; }
  .page:last-child { page-break-after: auto; }
  /* Slides are sized by the page here, not by the deck's flex track. */
  .page .slide { flex: 1; aspect-ratio: auto; border: none; box-shadow: none;
                 padding: 64px 72px; }
  .page .slide h3 { font-size: 2.6rem; }
  .page .slide .body { font-size: 1.15rem; }
  .page .slide .big { font-size: 2.2rem; }
  .page .slide .cap, .page .slide .d { font-size: 1rem; }
  .page .slide .v { font-size: 1.15rem; }
  .page .slide .slide-no { right: 44px; top: 40px; font-size: 0.8rem; }
</style></head><body>
${deck[1].replace(/<article class="slide">/g, '<div class="page"><article class="slide">').replace(/<\/article>/g, "</article></div>")}
</body></html>`;

  writeFileSync(`${SITE}/_slides-print.html`, print);

  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`file://${SITE}/_slides-print.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700); // let webfonts settle before the PDF snapshot
  await page.pdf({
    path: `${OUT}/i-agree-slides.pdf`,
    width: "1600px",
    height: "900px",
    printBackground: true,
    pageRanges: "1-3",
  });
  console.log("✓ i-agree-slides.pdf");
  await ctx.close();
}

await browser.close();

/* ------------------------------------------------------- 3. video copy */
copyFileSync(`${ROOT}/assets/demo-film.mp4`, `${OUT}/demo-film.mp4`);
console.log("✓ demo-film.mp4 copied");
