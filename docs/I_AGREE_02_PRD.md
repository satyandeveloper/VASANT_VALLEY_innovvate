# PRD — I AGREE: The Fine Print Decoder

A web app: paste a legal document or drop a link, get a verified, plain-language verdict in about ten seconds. Next.js on Vercel; one server-side AI analysis endpoint; Supabase for caching and the registry; Clerk for sign-in. One version — everything below ships in v1.

## Scope

**In:** paste and URL input · three risk categories · verified clause citations with in-document highlighting · confidence labels · deterministic Green/Amber/Red verdict · five-bullet summary with shareable image · fingerprint caching with a public registry of decoded documents · sign-in with personal history (fully usable signed out) · three pre-analysed sample documents · permanent disclaimer · deployed publicly, working on phone and laptop.
**Out:** legal advice, categories beyond the three, browser extension, multilingual, fairness index ranking apps.

## User flow

1. **Input.** Title, tagline, a paste box with live character count plus a URL tab, three sample-document chips, an Analyse button, a sign-in button, and the disclaimer in the footer of every screen.
2. **Analysing.** Progress messages ("Reading document → Scanning for risks → Verifying every quote against the source"), finishing in roughly ten seconds for typical documents, with a hard timeout and friendly retry.
3. **Results.** The verdict card on top; below it, flags grouped under the three categories; beside or beneath, the original document with every cited clause highlighted. Tapping a flag scrolls to and pulses its clause. A collapsed section lists anything that couldn't be verified.
4. **Registry and history.** A public page of recently decoded documents with titles and grades; a personal history page for signed-in users.

## Features

**Input.** Accepts pasted text between a few hundred and 200,000 characters. The URL tab fetches a link and extracts its readable text; if a site refuses, the app asks the user to paste instead. Three real, credited public sample documents (a social app's terms, a subscription service's terms, a rental agreement) load with one tap and return instantly from cache — the demo never depends on a live call.

**Analysis.** The document is examined for exactly three risks: data sharing, automatic renewal or difficult cancellation, and rights over user-created content. Long documents are processed in sections and the findings merged, with duplicates removed. Each flag has a severity (high, medium, low), a short plain-language title, a one-to-two-sentence explanation a 12-year-old understands, and a verbatim quote from the document.

**Verification — the core differentiator.** Every quote is checked against the source text, tolerating only spacing and punctuation differences. A confirmed quote is marked Verified and highlighted in the document. A quote that can't be confirmed is never displayed as evidence: the finding is demoted to a quote-free "needs human review" entry or dropped. Nothing unproven ever appears as proof.

**Verdict and sharing.** The grade follows a fixed rule so identical input always gives an identical result: Red when there are multiple high-severity flags or high flags in more than one category; Amber for a single high flag or several mediums; Green otherwise. The card shows the grade, a one-line headline, severity counts, and a five-bullet summary built from the top verified flags (clean categories are noted as clean). A copy button grabs the summary with the disclaimer line, and one tap exports the headline and bullets as a shareable image.

**Caching and registry.** Every analysed document gets a normalised fingerprint. An identical document — however it arrives — returns instantly from cache instead of re-analysing. The public registry page lists recently decoded documents with title, grade, and time, making repeat demos instant and the "documents are recognised and reused" claim visible.

**Accounts and history.** Sign-in is optional. Signed-in users' analyses are saved to a personal history list they can reopen. Nothing about analysis requires an account.

**Honesty and safety.** The disclaimer — "This tool explains text; it does not replace legal advice." — appears on every screen. No statistic appears in the interface unless the team actually measured it. The AI key stays server-side; input length is capped; requests are lightly rate-limited.

**Edge cases.** Very short input asks for the full document; oversized input asks the user to trim; ordinary non-legal text returns a calm "this doesn't look like a terms document" result with no flags; a failed URL fetch offers paste; an analysis failure shows a retry, with the sample documents still working from cache.

## Acceptance

- Three different real public documents analyse end to end without crashing, on a phone and a laptop, from the deployed URL.
- Every displayed quote matches the source verbatim (spot-check ten by hand); zero unverified quotes shown as evidence.
- Re-running the same document returns instantly from cache, and it appears on the registry page; a signed-in user finds it in history.
- The URL tab succeeds on at least one public terms page and falls back politely on a blocked one.
- The share image renders the headline and five bullets legibly.
- Sample chips respond in under a second; re-runs reproduce the same verdict; a Class 6 student can explain one verdict back correctly.
- The disclaimer is visible everywhere, and the app claims nothing it cannot demonstrate.
