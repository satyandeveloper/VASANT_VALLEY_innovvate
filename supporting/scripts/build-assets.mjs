/**
 * Build the packet's static assets:
 *   assets/SATYA_SCHOOL_Prototype_Screenshot.png   a sharp screenshot of a real analysis
 *   assets/SATYA_SCHOOL_Presentation.pdf          the three slides, one per landscape page
 *   assets/SATYA_SCHOOL_Video_Poster.png          the video poster frame
 *
 * The PDF is produced from index.html itself rather than from a copy of it,
 * so it cannot drift from the slides on the page.
 *
 * Usage: node build-assets.mjs [prototype|slides|video]
 *
 * With no argument every step runs. Naming one runs only that step, which
 * matters because the steps have very different requirements: `slides` reads
 * the local index.html and works offline, while `prototype` drives the
 * deployed site and fails whenever that is down or mid-deploy. Retypesetting
 * the page should not be blocked on production being reachable.
 */
import { chromium } from "playwright";
import { mkdirSync, copyFileSync } from "node:fs";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const SITE = `${ROOT}/site`;
const OUT = `${SITE}/assets`;
mkdirSync(OUT, { recursive: true });

const DOC = `ACME CLOUD — TERMS OF SERVICE

1. Content Licence. By uploading content you grant Acme a perpetual, irrevocable, worldwide, royalty-free licence to reproduce, modify, publish and create derivative works from that content for any purpose, without compensation to you.

2. Data. We share your personal information, device identifiers and precise location data with advertising partners and analytics providers, and with any successor entity in the event of a merger or sale of assets.

3. Renewal. Your subscription renews automatically for successive one-year terms at the then-current rate unless you cancel in writing at least thirty days before the renewal date. Fees already charged are non-refundable.`;

const STEPS = ["prototype", "slides", "video"];
const only = process.argv[2];
if (only && !STEPS.includes(only)) {
  console.error(`Unknown step "${only}". Expected one of: ${STEPS.join(", ")}`);
  process.exit(1);
}
const wants = (step) => !only || only === step;

// Launching Chrome for a step that only copies a file would be a pointless
// dependency on having a browser at all.
const browser =
  wants("prototype") || wants("slides") ? await chromium.launch({ channel: "chrome" }) : null;

/* ---------------------------------------------- 1. prototype screenshot */
if (wants("prototype")) {
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
  await page.screenshot({ path: `${OUT}/SATYA_SCHOOL_Prototype_Screenshot.png` });
  console.log("✓ SATYA_SCHOOL_Prototype_Screenshot.png");
  await ctx.close();
}

/* ------------------------------------------------------ 2. slides PDF */
if (wants("slides")) {
  // The page itself is the source: load index.html and reshape its DOM into one
  // slide per printed page. Reusing the real document means the PDF inherits
  // the same <head> — the same webfonts and the same stylesheet — so it cannot
  // drift from the deck on the page. An earlier version scraped the deck out
  // with a regex and restated the font links here; the regex broke the first
  // time a class was added to the deck, and the restated fonts silently went
  // stale when the packet was retypeset, printing the PDF in a fallback face.
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`file://${SITE}/index.html`, { waitUntil: "networkidle" });

  const slideCount = await page.evaluate(() => {
    const slides = [...document.querySelectorAll(".deck .slide")];
    if (!slides.length) throw new Error("no slides found in index.html");
    const pages = document.createDocumentFragment();
    for (const slide of slides) {
      const page = document.createElement("div");
      page.className = "page";
      page.appendChild(slide); // moves it out of the deck
      pages.appendChild(page);
    }
    document.body.replaceChildren(pages);
    return slides.length;
  });

  // Page geometry only — everything else is inherited from the live stylesheet.
  await page.addStyleTag({
    content: `
      @page { size: 1600px 900px; margin: 0; }
      body { background: #fff; }
      .page { width: 1600px; height: 900px; display: flex; page-break-after: always; }
      .page:last-child { page-break-after: auto; }
      .page .slide { flex: 1; aspect-ratio: auto; border: none; box-shadow: none;
                     padding: 64px 72px; }
      .page .slide h3 { font-size: 2.7rem; }
      .page .slide .body { font-size: 1.15rem; }
      .page .slide .eyebrow { font-size: 0.8rem; }
      .page .slide .big { font-size: 2.2rem; }
      .page .slide .cap, .page .slide .d { font-size: 1rem; }
      .page .slide .v { font-size: 1.2rem; }
      .page .slide .k { font-size: 0.72rem; }
      .page .slide .no { right: 44px; top: 40px; font-size: 0.8rem; }
    `,
  });
  await page.waitForTimeout(700); // let webfonts settle before the PDF snapshot
  await page.pdf({
    path: `${OUT}/SATYA_SCHOOL_Presentation.pdf`,
    width: "1600px",
    height: "900px",
    printBackground: true,
    pageRanges: `1-${slideCount}`,
  });
  console.log("✓ SATYA_SCHOOL_Presentation.pdf");
  await ctx.close();
}

if (browser) await browser.close();

/* ------------------------------------------------------- 3. video copy */
if (wants("video")) {
  copyFileSync(`${ROOT}/assets/demo-film.mp4`, `${OUT}/SATYA_SCHOOL_Demonstration_Video.mp4`);
  console.log("✓ SATYA_SCHOOL_Demonstration_Video.mp4 copied");
}
