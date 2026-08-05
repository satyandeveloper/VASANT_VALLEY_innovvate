/**
 * Render the share image to a PNG so it can actually be looked at.
 *
 * The route needs a stored analysis, so without a working database the image
 * is unviewable — which is how it went unseen for so long. This renders the
 * same component against a representative analysis.
 *
 *   npx tsx scripts/og-preview.tsx [out.png]
 */
import { writeFileSync } from "node:fs";
import { ImageResponse } from "next/og";
import { ShareImage, shareFonts } from "@/app/api/og/share-image";
import type { Analysis } from "@/lib/types";

const DOC = `ACME CLOUD — TERMS OF SERVICE

1. Content Licence. By uploading content you grant Acme a perpetual, irrevocable, worldwide, royalty-free licence to reproduce, modify, publish and create derivative works from that content for any purpose, without compensation to you. This licence survives termination of your account and applies in any medium now known or hereafter devised.

2. Data. We share your personal information, device identifiers and precise location data with advertising partners and analytics providers, and with any successor entity in the event of a merger or sale of assets. You may not opt out of this sharing while continuing to use the Service.

3. Renewal. Your subscription renews automatically for successive one-year terms at the then-current rate unless you cancel in writing at least thirty days before the renewal date. Fees already charged are non-refundable in whole or in part.

4. Liability. To the maximum extent permitted by applicable law, the Company disclaims all warranties, express or implied, and shall not be liable for any indirect, incidental, special or consequential damages howsoever arising.`;

const q1 = "By uploading content you grant Acme a perpetual, irrevocable, worldwide, royalty-free licence to reproduce, modify, publish and create derivative works from that content for any purpose, without compensation to you.";
const q2 = "We share your personal information, device identifiers and precise location data with advertising partners and analytics providers";
const q3 = "Your subscription renews automatically for successive one-year terms at the then-current rate unless you cancel in writing at least thirty days before the renewal date.";

const mk = (q: string, severity: "high" | "medium" | "low", title: string) => ({
  category: "data_sharing" as const, severity, title, explanation: "",
  quote: q, start: DOC.indexOf(q), end: DOC.indexOf(q) + q.length,
});

const analysis: Analysis = {
  id: "demo", title: "Acme Cloud Terms of Service", sourceType: "paste", sourceUrl: null,
  docText: DOC, verdict: "red",
  headline: "3 serious red flags — read before you agree.",
  summaryBullets: [], unverified: [], cached: false, createdAt: new Date(0).toISOString(),
  flags: [
    mk(q1, "high", "Permanent rights to your uploads"),
    mk(q2, "high", "Personal data shared broadly"),
    mk(q3, "medium", "Automatic yearly renewal"),
  ],
};

async function main() {
const fonts = await shareFonts();
console.log("fonts loaded:", fonts.map((f) => f.name).join(", ") || "NONE (system fallback)");
const res = new ImageResponse(<ShareImage analysis={analysis} />, {
  width: 1200, height: 630, ...(fonts.length ? { fonts } : {}),
});
const buf = Buffer.from(await res.arrayBuffer());
writeFileSync(process.argv[2] ?? "og-preview.png", buf);
console.log("wrote og.png", buf.length, "bytes");

}
main();
