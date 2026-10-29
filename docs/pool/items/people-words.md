---
id: people-words
title: "Words:"
area: people
kind: feature
priority: 2
status: open
claimed-by:
pr: #5180
blocked-on:
milestone:
source: "docs/coordination/OPUS-PEOPLE.md line 19 (unchecked checklist line)"
claimed-at:
---

**What.** Two Words pieces remain from the press work: the interview lines (reporter questions as plain, further, turn, brief and the lie) and the printed-story row in bring-it-up (SG-PEOPLE-press-bring-it-up-row). The bank for interviews is `data/english/parts/interview.json` and the bring-it-up rows are `src/director/data/bring-it-up-rows.json`. PR #4156 (as of 2026-10-15) has no pool item; check whether it has merged. The player would notice a reporter asking real questions and neighbors mentioning what the paper printed.

**Rules.** No hand-written player text: all lines come from the English banks, authored with origin or mined from public-domain sources with source recorded; none typed into code; An effect is a read, not a record: the interview reads the candidate's record and the reporter's outlet, and bring-it-up reads the `printed:` fact; Ask why: each line cites the story or record it came from; No dice: who asks and what they ask follows the reporter's traits and the record, not a roll; Research before building: mined lines are public-domain with the source kept; American English: spellings follow `tests/american-english-sweep.test.ts`; Placeholders: SG-PEOPLE-press-bring-it-up-row closes with the row.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a candidate's interview in the year composes its questions and answers through the engine (outlet and interview ids named), and a reader brings up a printed story with the outlet named. Tests in `tests/english-parts-banks.test.ts` and `src/director/bring-it-up.test.ts`, and the lines graded in the next words batch. The owner plays it: gives an interview and hears the paper mentioned later. **On screen.** Nothing yet: it would show on News, and nothing there reads it.

**Files.** data/english/parts/interview.json, data/english/parts/bring-it-up.json, src/director/data/bring-it-up-rows.json, src/core2/press-desk.ts

**Notes.** Checklist line from OPUS-PEOPLE.md; verify against main before starting.

Sent back 2026-10-20 from PR #5180 (branch claude/political-game-pool-76ksvw): Merging current origin/main conflicts in code: src/bench/campaign-day-controls.test.ts, src/bench/campaign.ts, src/bench/creator.ts, src/bench/data/controls.json, src/bench/play.mjs, src/core2/counted-weight-money.test.ts, src/core2/modules/business.ts, src/core2/modules/place-prices.ts, src/core2/modules/press.ts, src/core2/news.test.ts, src/core2/office-proof.test.ts and src/director/office-scene.ts. Resolve these on this branch, preserving the current player controls, main behavior and each included fix, then rerun changed-file checks and the named proofs for the items this PR actually completes. Documentation/register conflicts are not the blocker.; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): already built (interview + printed-story rows).
