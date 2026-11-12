---
id: core-country-tier-town-joins-its-state-part-1-each-seller-has-a-sector
title: "The town joins its state, part 1: every kind of business in the town belongs to one of the country tier's sectors"
area: core
kind: feature
priority: 1
size: S
status: merged
standard: 2
claimed-by:
pr: #8172
after:
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: design-country-tier
source: split from core-country-tier-town-joins-its-state by Fable, Nov 10, 2026 (owner, Nov 10: every assignment works without Fable)
checked: fable 2026-11-10
merged-at: 2026-11-10T22:56:19.000Z
---

**What.** The country tier keeps every state's employers by sector. The town keeps its businesses by kind. Nothing says which sector a kind belongs to, so a town seller cannot be matched to the buyers its state and the nation hold. This part adds that one table.

**Cause.** Found in code: `COUNTRY_SECTORS` (src/core2/country-model.ts line 17) names the tier's sectors, and the town's business kinds are rows in src/core2/data/business-books.json read through `kindId` (src/core2/business-books.ts line 31). The only mapping from a kind to a sector was a table named `kindSector` in src/core2/data/jobs/jobs.json that no code read, with no reason given for any row and no row for the utility kind.

**Fix.** Add a sector to every kind row in src/core2/data/business-books.json and a reader `sectorOfKind` in src/core2/business-books.ts, and delete the unread `kindSector` table from src/core2/data/jobs/jobs.json in the same change, so there is one table. Choose each sector from the kind's industry code where the row carries one, otherwise from what the kind sells, and write the reason in the row's source text. Add a test that every kind has a sector that is in `COUNTRY_SECTORS`, and that prints, for a drawn place, the town's businesses counted by sector.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** One rule, all 56 places: the table is by kind, never by place. Every number or mapping in data carries its source. No second list of sectors: the tier's list is the only one.

**Done when.** A second session runs the new test in a drawn place it names with its seed and reads its printed line: every business in the town has a sector, with the count by sector. In the running game it opens dev mode's Trace on one business and reads its kind, then finds that kind's sector in the table.

**Waits on.** Nothing.

**Files.** src/core2/data/business-books.json, src/core2/business-books.ts, src/core2/country-model.ts

**Notes (Fable B, Nov 10, marked merged by hand).** Pull request 8172 merged at 2026-11-10 22:56 UTC and built this item, but the item stayed in review: its `pr:` field held the number with no `#`, which the merge's flip does not match, and the pull request's first line named no item (pool item pool-merge-does-not-flip-an-item-whose-pr-field-has-no-hash). A second session's check in the game is still owed.
