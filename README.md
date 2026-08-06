# I AGREE — the fine print decoder

Paste a Terms of Service, privacy policy or rental agreement — or give it a
link — and get a plain-English verdict in about ten seconds, where **every
warning is anchored to the exact words in the document that caused it**.

Live: **[innovvate.devjindal.me](https://innovvate.devjindal.me)**

---

## The claim, and why it needs code rather than a prompt

An AI asked to summarise a contract will occasionally invent a clause that was
never in it. That failure is quiet — invented terms read exactly like real
ones — and it is fatal for a tool whose entire purpose is telling someone what
they are agreeing to.

So the model is never trusted on its own. Every flag it returns **must** carry
a verbatim quote, and that quote is then checked character by character against
the source text before a reader ever sees it:

- **Matched** → the flag is shown, highlighted in place in the document, and
  the text displayed is the *document's* words, not the model's paraphrase of
  them (`lib/analysis/pipeline.ts` substitutes the real slice).
- **Not matched** → the flag is withheld into a separate "unverified" list. It
  is never quietly dropped, and never dressed up as fact.

Only verified flags feed the verdict, so nothing unproven can change the grade.

The matcher tolerates the ways a model reformats a real quote — curly quotes,
em dashes, collapsed line wrapping, added punctuation — while refusing to
assemble a quote the document never contained. That balance is the delicate
part, and it is what most of `tests/verification.test.ts` exists to hold in
place. One example of the tension: a quote may be re-found after trimming a
clipped word off each end, but the trim is abandoned if it would discard a
negation, because "you do **not** grant a perpetual licence" must never match
"grant a perpetual licence".

---

## Running it

```bash
npm install
cp .env.example .env.local   # then fill in the keys below
npm run dev                  # http://localhost:3000
```

| Variable | Required | Purpose |
| --- | --- | --- |
| `OPENAI_API_KEY` | yes | The analysis itself |
| `NEXT_PUBLIC_SUPABASE_URL` | no | Cache, registry, history, rate limits |
| `SUPABASE_SECRET_KEY` *(or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`)* | no | As above |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY` | no | Sign-in and saved history |

Everything except the OpenAI key is optional, and the app degrades in the open
rather than breaking: with no database there is no cache or registry, and with
no Clerk keys the sign-in UI does not render at all. `/api/health` reports
which subsystems are configured and which have failed most recently.

Database setup, when you want one:

```bash
npx supabase db query --linked -f supabase/schema.sql   # idempotent, safe to re-run
```

## Checks

```bash
npm test          # unit tests, offline, well under a second
npm run typecheck
npm run lint
npm run check     # all three
```

Tests use Node's built-in runner via `tsx` — no test-framework dependency.
Everything under `tests/` is pure and offline, so the suite is trustworthy in
CI and on a plane. The two things that genuinely cannot be tested that way have
scripts instead, because stubbing them would only assert that the stub matches
the assumption being tested:

```bash
npx tsx scripts/check-quota.ts    # rate limits, against the real database
npx tsx scripts/bench-models.ts   # model cost vs verbatim-quote accuracy
```

---

## How the code is laid out

```
app/                    Next.js App Router — pages and API routes
  api/analyze/          the one endpoint that matters: text or URL -> Analysis
  api/health/           per-subsystem status, including last failure
  api/og/               share image, rendered with satori
  results/[id]/         a saved analysis, linkable and shareable

components/             presentation only; no analysis logic lives here

lib/
  analysis/             turning document text into a verdict
    pipeline.ts           orchestration: cache -> sections -> model -> verify -> store
    openai.ts             the model call and its strict response schema
    sectioning.ts         overlapping splits so no clause is lost at a seam
    verification.ts       the quote matcher — the product's core claim
    verdict.ts            deterministic grading from verified flags only
    summary.ts            the copyable summary
    fingerprint.ts        normalised hash powering the cache
  documents/
    extract.ts            fetching and reading a URL, with SSRF guards
  platform/
    errors.ts             error classification, structured logs, health memory
    rate-limit.ts         5 free analyses a month, 100 signed in
    supabase.ts           the database client, absent-by-default
    visitor.ts            the anonymous identity the free tier is counted under
  types.ts                the shared vocabulary
  palette.ts              hexes for the two surfaces that cannot read the CSS

tests/                  unit tests, offline
scripts/                one-off tools: seeding, benchmarking, quota checks
supabase/schema.sql     the whole database, idempotent
supporting/             submission packet: the site, the slides, the video
```

## Error handling

Failures are classified from providers' **structured** fields (`code`, `type`,
`status`), never by matching words in a message — providers reword messages
without notice, and a classification that depends on wording silently
reclassifies itself one day. Each failure produces three things at once:

- a message safe to show a user, carrying no keys, hostnames or internals;
- a one-line JSON log filterable by `code` / `scope` / `requestId`;
- a `retryable` flag, so the UI only offers Retry when retrying could work.

Every response carries a short `requestId` that also appears in the log line,
so a user can quote it and the exact request can be found.

Reads degrade rather than throw: `supabase-js` *returns* its errors instead of
throwing them, so every query goes through `unwrap()` in
`lib/platform/errors.ts` — otherwise a broken database reads as an empty result
set, which is the same thing as lying.

## Known limits

- The SSRF guard inspects the literal host. A public hostname whose DNS points
  at a private address is still fetched; closing that needs resolution-time
  pinning, which Node's `fetch` does not expose.
- The free-tier identity is a cookie, so clearing it earns a fresh allowance.
  The per-IP burst window is what actually caps abuse.
- This is an information tool, not a law firm. It does not give legal advice
  and it will not catch everything.
