---
id: core-old-imports-opening-employment-jail-term
title: "The opening's employment allocation reads who is in jail from the core's own records, not the old jail-terms module"
area: core
kind: cleanup
priority: 2
size: S
status: in-pr
claimed-by: claude/old-imports-jail-term
pr: #5073
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T18:12:30.665Z

**What.** The opening's employment allocation asks the old engine whether a resident is serving a jail term (`jailTermOn` in src/simulation/justice/jail-terms.ts) before it marks them employable. Move that read into the core: the opening takes the sentence, clemency and reversal records it needs from the core's own opening history and answers the same question. Nothing new is added to the old engine, and nothing old is deleted until core-delete-old-engine.

**Rules.** Replace, never layer: the jail-terms import is deleted from opening-employment.ts in the same change. One rule, all 56 places: the move names no state, city or GEOID. No dice: a jail term comes from the sentence record and its dates, never a roll.

**Done when.** In a drawn place and seed named in the PR body, buildBenchWorld opens with the same employment records as before, a resident serving a jail term on the opening date (shown by person record id) is left out of the candidates exactly as before, and src/core2/opening-employment.ts no longer imports src/simulation/justice/jail-terms; the opening employment tests in src/core2 pass.

**Files.** src/core2/opening-employment.ts, src/simulation/justice/jail-terms.ts

**Notes.** Split Oct 19 from core-old-imports-opening-employment, which is L in practice.
