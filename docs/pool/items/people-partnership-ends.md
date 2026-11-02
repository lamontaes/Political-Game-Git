---
id: people-partnership-ends
title: "A partnership ends from strain, closeness and money, and one partner moves out"
area: people
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
after: core-household-membership-change
source: added with npm run pool -- add
claimed-at:
---

**What.** A partnered pair of full people separates when strain between them, their closeness and their money make staying worse for at least one of them, and one partner moves out of the shared home. The core can already do both halves but nothing calls them in play: setPartnersV1 with together false (src/core2/state.ts, around line 1764) closes the partner link, writes a family:former-partner fact for each person and emits family.separated, and changeHouseholdV1 moves a person into a new household with the lease payers following (done item core-household-membership-change). So no partnership ends in a played year, and the director's broke-up and separated scenes (src/director/data/situation-types.json, marked awaitingProducer) have no record to wait on. The owner's Oct 19 pairing ruling (docs/coordination/OWNER-DECISIONS.md, Pairing) says who pairs reads each person's own record, including orientation, so the ending rule must not assume the pair is a woman and a man. Which existing record carries the strain, and whether the law data holds a divorce rule to read (no question with those words was found in data/research/laws/starting-law-2026; the bill catalog has a Marriage, divorce and custody menu), are not yet known and the worker must name them.

**Rules.** No dice: a partnership ends from the pair's closeness, strain, money, ages and traits, never from a fixed percentage, and real divorce rates (CDC and ACS) check totals only. Wire to the world: the move-out is a household change through changeHouseholdV1 with the lease and cash following by journal record, not a flag. One model, two tiers: counted pairs follow the same weighing times their count, which is the open item people-partnership-counted.

**Done when.** In a one-year run of the played world (buildBenchWorld, a drawn place from all 56, seed named in the PR body) a named couple is traced from the closeness and strain records to the ended partner link id, the new household and lease ids and the journal record that split their cash, and a test in src/core2 that names the place and seed shows the births engine no longer reads them as a couple. **On screen.** Nothing yet: it would show on Who you are and News, and nothing there reads it.

**Files.** src/core2/modules/people.ts, src/core2/state.ts, src/core2/modules/housing.ts, src/core2/closeness.ts

**Notes.** TODO

Sent back 2026-10-17 from PR #4970 (branch claude/partnership-ends): Morning check: the partnership-ending stack includes the non-Words edit to protected src/director/play-modules.ts and the Core/World prerequisites inherited from #4959 and #4963. Land the installation through a Words-owned PR, merge the Core household/family-link prerequisites, and record World agreement for the housing helpers (or split those helpers). Merge main into this branch afterward so its remaining separation changes can be validated.; finish on that branch, merge main into it first.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: rewrite SMART, apply OD:588; stacked on people-partnership-forms.

Oct 29 (CTO, second account): PR #4970 closed as stale under the owner's standing approval; back to open. Branch `claude/partnership-ends` is kept; claiming this item takes it over.
