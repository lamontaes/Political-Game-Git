---
id: core-counted-estates
title: "A counted resident's death passes no estate to heirs"
area: core
kind: wiring
priority: 2
size: M
status: done
claimed-by:
pr: #4724
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Most deaths in a town are counted residents, removed by `removeCountedPerson` in `src/core2/births-counted.ts`, and nothing passes their cash to anyone: `settleEstate` (`src/core2/estates.ts`) runs only for full people, and a played year in four drawn places (three years each) showed no estate at all because a town has only about 100 full residents. Pass a counted death's share of its household's cash to the household's surviving members (or the group's heirs by the same will and intestacy rules, times the count), so a death in a small town leaves an estate that someone inherits. The player notices a neighbor's death leaving money to the family.

**Rules.** One model, two tiers: a counted death follows the same estate rule as a full person's, times its count. No dice. Every dollar balances on the journal. Wire to the world: the heir's account changes by journal entry.

**Done when.** In a one-year `buildBenchWorld` run in a place drawn from all 56 (name it and the seed in the PR body) a counted resident's death moves cash to a named heir or the surviving household by journal entry id, every dollar balanced, and a test in `src/core2/` names the dead and the heir.

**Files.** src/core2/births-counted.ts, src/core2/estates.ts, src/core2/modules/residents.ts

**Notes.** Found taking core-opening-resident-cash.

Sent back 2026-10-16 from PR #4724 (branch claude/core-counted-estates): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
