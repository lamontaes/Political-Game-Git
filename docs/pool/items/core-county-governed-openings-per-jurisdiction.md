---
id: core-county-governed-openings-per-jurisdiction
title: "A drawn county-governed locality opens in each qualifying jurisdiction"
area: core
kind: feature
priority: 3
size: M
status: done
claimed-by:
pr: #5944
blocked-on:
source: added with npm run pool -- add
---

**What.** PR #5944 adds a bounded opening regression after the Bayou Blue fix already landed through #5899. It draws one county-governed locality in every jurisdiction whose place records contain that class and builds each opening, naming every failure. Track this per-jurisdiction test separately from the unfinished exhaustive check of every qualifying locality so the original acceptance stays open.

**Rules.** One rule, all 56 places: discover jurisdictions and eligible localities from government-unit records rather than a named list. Draw within each eligible jurisdiction from the replay seed, report place keys and build seeds, and never redraw past an opening failure.

**Done when.** The opening-customers-county-office.test.ts file passes its Bayou Blue and ordinary drawn-place regressions plus the record-derived per-jurisdiction opening case, which names every selected locality and rejects any build failure; the PR records the seed and count, while core-opening-public-coverage-conflict-bayou-blue and core-opening-coverage-every-locality stay open for exhaustive acceptance.

**Files.** src/core2/opening-customers-county-office.test.ts

**Notes.** Bounded per-jurisdiction test split by Merger 0 on Oct 25 for PR #5944, following the prior review allowance for an explicit bounded split. This item does not claim every eligible locality was built.
