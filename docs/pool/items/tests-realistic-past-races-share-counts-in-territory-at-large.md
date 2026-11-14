---
id: tests-realistic-past-races-share-counts-in-territory-at-large
title: "Two worlds of a Northern Marianas town share two past-race vote counts, and the guard goes red by draw"
area: core
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after: core-opening-past-race-repeats-a-real-vote-count
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: door scenes thread (#9102 gate), Nov 14, 2026, on the Account lead's note
claimed-at:
---

**What.** The `two-seeds-differ` guard (`npm run guards`, src/core2/realistic-not-real.test.ts, row 44 "past races' votes cast and the national polls on policy questions") went red by draw on the #9102 head a7020f5b with the train 3076c608 merged in. The guard had passed 20 of 20 on the same branch at 228035b0, and no file the PR changed is read by it.
Seen: Kagman I, Northern Mariana Islands (territory:MP:kagman-i), REALISTIC_SEED 272b64ab212c699a, so the two worlds are seeds `272b64ab212c699a:a` and `272b64ab212c699a:b`. The failure: "2 of 21 large races share a count between the two worlds (prior-election:seat:US-MP:lower:At-large:15:2024-11-05, prior-election:seat:US-MP:lower:At-large:7:2024-11-05): expected 2 to be less than or equal to 1".

**Cause.** Measured: Kagman I, Northern Mariana Islands, REALISTIC_SEED=272b64ab212c699a, `npm run guards` on a7020f5b. The bound is `ceil(large × 3/87)` (`SAME_COUNT_SHARE`), which is 1 for the 21 large races here. Both shared counts are at-large seats of the territory's lower house. core-opening-past-race-repeats-a-real-vote-count measured why at-large territory seats share counts by chance: each count is one offset of at most 4% around the same center in both worlds (`worldLevel` in `buildPriorElections`, src/core2/past-elections.ts), so about 21 at-large seats of a similar size can share one now and then. The Account lead's note (Nov 14) is a lead, not a measurement: another thread found that the four territories record no local government, which may make two seeds give more nearly the same world there. Not chased further.

**Fix.** Needs a reading of whether two shares in 21 is chance under the measured band or a narrower spread in territories. Next step: rerun with REALISTIC_SEED=272b64ab212c699a, print both worlds' centers and offsets for the two seats, and compare them with a state's at-large seats. Never loosen the bound or raise the thousand-vote floor (CTO, Nov 12).

**Time box.** 1 hour for one Sonnet session.

**Rules.** No dice; one rule, all 56 places; never loosen a test without asking the lead.

**Done when.** A second session, on the train or main, runs `REALISTIC_SEED=272b64ab212c699a npx vitest run src/core2/realistic-not-real.test.ts` (Kagman I, Northern Mariana Islands) and sees it pass, then runs three fresh draws, one in a territory, and sees each pass with its drawn place named; in the running game, the archive stories of a drawn territory town's 2024 at-large races (src/core2/past-news.ts) give different counts in two seeds. The PR body says why the two worlds shared these two counts.

**Waits on.** Nothing.

**Files.** src/core2/realistic-not-real.test.ts, src/core2/past-elections.ts
