---
id: release-pool-claim-ignores-after
title: "pool claim lets a session claim an item whose after: items are not done"
area: release
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/pool-claim-after
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T23:33:02.766Z
---

**What.** `npm run pool -- claim` accepted items whose `after:` items were not done, although the index lists them as gated. On Oct 19 one session claimed `people-partnership-counted` and `gov-outside-revenue-retire-plug` while their prerequisites were still in a PR or blocked, and had to release them. The claim command now refuses with the names of the items it waits on.

**Rules.** Placeholders: a claim is a promise to build now, so a gated item must never be claimable. Replace, never layer: the check lives in the claim command only, with no second gate in the index.

**Done when.** The test in scripts/pool/index.test.ts claims an item whose `after:` item is only claimed and gets the "waits on" refusal, then passes once the prerequisite is done, in the existing claims-and-gates fixture.

**Files.** scripts/pool/index.ts, scripts/pool/index.test.ts

**Notes.** Found Oct 19 while taking items from the pool.
