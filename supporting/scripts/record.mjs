/**
 * Capture real product footage from the live prototype.
 *
 * Records one continuous session and writes a marks.json of wall-clock
 * offsets for each beat, so the Remotion edit can cut to real timings
 * instead of hand-guessed frame numbers.
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const URL = process.env.DEMO_URL ?? "https://innovvate.devjindal.me";
const OUT = "supporting/assets/raw";
mkdirSync(OUT, { recursive: true });

const DOC = `ACME CLOUD — TERMS OF SERVICE

1. Content Licence. By uploading content you grant Acme a perpetual, irrevocable, worldwide, royalty-free licence to reproduce, modify, publish and create derivative works from that content for any purpose, without compensation to you.

2. Data. We share your personal information, device identifiers and precise location data with advertising partners and analytics providers, and with any successor entity in the event of a merger or sale of assets.

3. Renewal. Your subscription renews automatically for successive one-year terms at the then-current rate unless you cancel in writing at least thirty days before the renewal date. Fees already charged are non-refundable.`;

const marks = [];
const t0 = () => Date.now();
let start;
const mark = (name) => {
  marks.push({ name, ms: Date.now() - start });
  console.log(`  mark ${name} @ ${((Date.now() - start) / 1000).toFixed(2)}s`);
};

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  deviceScaleFactor: 2,
  recordVideo: { dir: OUT, size: { width: 1280, height: 800 } },
});
const page = await ctx.newPage();

start = t0();
await page.goto(URL, { waitUntil: "networkidle" });
mark("hero");
await page.waitForTimeout(2600);

// Scroll the form into view the way a person would.
await page.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
await page.waitForTimeout(1400);
mark("form");

const ta = page.locator("#doc");
await ta.click();
// Typed fast enough to read as intent, not as a keystroke log.
await ta.type(DOC, { delay: 6 });
await page.waitForTimeout(900);
mark("pasted");

await page.getByRole("button", { name: /decode it/i }).click();
mark("analyzing");

await page.waitForSelector("text=/red flags|read carefully|looks fair|not a contract/i", {
  timeout: 90_000,
});
await page.waitForTimeout(1200);
mark("verdict");

await page.evaluate(() => window.scrollBy({ top: 380, behavior: "smooth" }));
await page.waitForTimeout(2200);
mark("flags");

// The payoff: a flag jumps to the exact clause that caused it.
const showMe = page.getByText(/show me this clause/i).first();
if (await showMe.count()) {
  await showMe.click();
  await page.waitForTimeout(2800);
  mark("clause");
}

await page.evaluate(() => window.scrollBy({ top: 420, behavior: "smooth" }));
await page.waitForTimeout(2400);
mark("end");

await ctx.close();
await browser.close();

writeFileSync(`${OUT}/marks.json`, JSON.stringify(marks, null, 2));
console.log("\nmarks written:", marks.map((m) => m.name).join(", "));
