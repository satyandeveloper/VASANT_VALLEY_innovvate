# I AGREE — What the Source Documents Say
*Consolidated from all 11 uploaded files. This is a record of the sources: where they describe features as "optional" or scoped to a later phase, the team's final decision supersedes them — everything ships in a single v1, per the Brief, PRD, and Plan.*

## The product

**I AGREE — The Fine Print Decoder.** *"Every month you sign dozens of contracts you never read. We make them readable in ten seconds."* Paste any Terms of Service, privacy policy, or rental agreement → a ten-second verdict card: data taken, rights surrendered, red flags ranked by severity, plus a shareable five-bullet summary. Every flag cites the exact clause behind it, translated to plain language and shown beside the original sentence. Demo moment: paste a real app's terms, red flags animate in, the room goes "wait — they collect WHAT?"

## The problem

Ordinary people — students, parents, grandparents — click "I Agree" on 30–40 dense legal documents a month. The opacity is deliberate: complexity is the design. Real regrets collected: resold data, silent auto-renewals, permissions nobody knew they granted. Parents would use it for bank forms and rent agreements.

## Design thinking (the four official stages)

**Empathise:** survey classmates, parents, teachers on whether anyone has ever read a full ToS; expect near-universal "never," but report only the measured number — it becomes the Slide-1 hook. **Define:** understand, in under ten seconds and without legal knowledge, what a document takes from you before you click Agree. **Ideate:** a browser plug-in and a fairness index were considered; the paste-anything decoder with a ranked verdict card won. **Prototype & Test:** one AI analysis route on the team's standard stack; test against 15–20 real documents; iterate until a Class 6 student can explain a verdict back correctly.

## How it scored

Under the original seven-axis rubric it ranked mid-pack at 58/70 — "the designated fallback" — dragged down by originality and wow-factor. Re-judged against the four criteria the organisers actually publish (problem, design thinking, prototype, impact), it leads the field at **35/40**: Problem & Theme 9, Design Thinking 8 (9 with a measured before/after comprehension test, → 36/40), **Prototype 10** ("one AI route plus a card interface — the safest overnight build of anything explored"), Impact 8. The axes that hurt it aren't officially scored, and the preliminary is a recorded video, where its paste-to-verdict moment "is flawless on the tenth take." Consensus across every document: **highest floor, lowest build risk, the safest submission — not a consolation prize.**

## Strengths and weaknesses

**Could win:** direct theme match; understandable in seconds; fewest moving parts; retakeable demo; clause-beside-explanation builds trust; useful to almost everyone. **Could lose:** ToS summarisers already exist; "isn't this just an AI prompt in an interface?"; the model may misread legal wording or sound overconfident; it must never pose as legal advice.

## The defence (quoted consistently across five documents)

> "We built a verification layer around the model. Every warning links to the exact source clause, related clauses are grouped, long documents are processed in sections, and repeated documents can be recognised and reused."

The documents stress this is credible **only if genuinely implemented** — clause citation, sectioned processing, and document recognition are real engineering.

## The five mandatory improvements

1. Limit v1 to three risks: data sharing; auto-renewal or difficult cancellation; rights over user-created content.
2. Every warning shows risk name, plain explanation, exact source clause, and a confidence label or "needs human review."
3. Run a real before/after comprehension test; report only measured results.
4. Prepare two or three credited, public demo documents that produce consistent output.
5. Add the safety line: "This tool explains text; it does not replace legal advice."

## Technical notes

The leanest concept explored: a single AI server route turns pasted legalese into a structured result the interface renders as the verdict card. Exact-clause citation is called "the Q&A armour." Long documents are sectioned, analysed, and merged. Caching by document fingerprint enables a public registry of decoded documents and instant repeat demos. Optional conveniences, not dependencies: pulling a document from a URL, and generating a shareable summary image. Zero external keyed services — the lowest demo risk of any idea.

## Submission requirements

Team of exactly four · description ≤ 200 words in a fixed order (problem + survey stat, one real user finding, the process, what the prototype does, impact) · ≤ 3 slides (problem + stat; the design-thinking journey — a scored axis, not decoration; product + impact + roadmap) · video ≤ 2 minutes, screen-recorded, prototype working within 30 seconds, one main demonstration, no slides inside, clear without narration · deployed URL working on phone and laptop · a credits file naming every library, dataset, prior project, and AI-assisted tool (AI tools are explicitly permitted; omitting credits is "disqualification-grade") · every file named `VASANT_VALLEY_Filename.filetype` · upload well before 9:00 pm IST. Final round 14 Aug, four minutes plus Q&A — rehearse the wrapper answer.

## Integrity rules

Only real, measured numbers anywhere; credit everything including prior art (existing ToS summarisers); don't copy another product's interface; make no claim the prototype cannot prove.

## Roadmap seeds

Browser extension that flags terms before you click · a fairness index ranking popular apps · a growing public registry of decoded documents · per-account history.
