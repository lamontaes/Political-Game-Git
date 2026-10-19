---
id: play-m0-02-check-follows-day-ruling
title: "Golden path M0-02 (play anyone) fails on every seed: it expects a choice list in a week that the Oct 14 ruling says never opens one"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4722
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** The golden-path check M0-02 (src/bench/m0-check.ts) advances a chosen resident a week and expects the player to be offered a choice list, then answers it on purpose. Since the owner's October 14 ruling that Day never opens a choice list, the character answers its own choices with the core's selection and only a stop (a scene, a fixed commitment or a deadline) ends the advance, so the check fails with "No choice was offered in seven days" on every seed, in the runner's Coal City, West Virginia and in places I drew (probe-1, probe-2). Rewrite the check to the current rule: over seven days every act of the chosen person is a recorded own-choice answer or a stop answer, no choice list opens, an offer nobody issued is refused and changes no record, and other residents' lives continue.

**Rules.** Changing a golden-path test is the CTO's to review: the PR body says what the old check asserted, which ruling replaces it and why. One rule, all 56 places: the check runs in the place the runner draws. No hand-written player text.

**Done when.** `node --max-old-space-size=8192 --import tsx src/bench/m0-check.ts M0-02` passes in a drawn place with the seed named in the PR body, the golden-path runner reports M0-02 passed, and the check names the pause ids of the chosen person's acts and shows each was answered by the character itself or a stop.

**Files.** src/bench/m0-check.ts, docs/roadmap/features.json

**Notes.** Found running the golden-path suite on Oct 16: M0-02 and M0-07 fail and M0-08 times out; the other goals are missing commands or not reached.

Sent back 2026-10-16 from PR #4722 (branch claude/play-m0-02-check): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
