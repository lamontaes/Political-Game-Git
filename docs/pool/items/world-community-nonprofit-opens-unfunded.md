---
id: world-community-nonprofit-opens-unfunded
title: "A community-organizing nonprofit opens with no cash and no funding source, so its worker is never paid"
area: world
kind: bug
priority: 2
size: M
status: open
lead: jobs
claimed-by:
pr:
blocked-on:
source: Money, Nov 9; scripts/money/pay-shortfall.ts
claimed-at:
---

**What.** Boulevard, California (key 0607694, seed pp-a): "Boulevard Neighbors United" (classification community:organizing-nonprofit, kind employer, organization_297af942b6740bfd) opens with `liquidMinor` 0 and the modeled zero-funded prototype source (no dated funding, no receipts), and its one community organizer (work-relationship_6da362bef63ce412, 17,013 a day) is paid nothing in a year: earned 6,222,760, paid 0, employer cash 0 at the end. A second employer (organization_cd524c66abde5ef1, job ended 2025-11-01) is the same. Earlier notes (world-private-zero-cash-employers-never-pay, Oct) found nonprofits paid in 11 drawn towns, so either the funding they had is gone or this class is funded only in some places.

**Rules.** Wire to the world: the nonprofit's money comes from its dues, donations or grants on the journal, read by the engine that runs payday; no invented refill. One rule for all 56 places. One model, two tiers.

**Done when.** At two drawn places and seeds (named in the PR body), `npx tsx scripts/money/pay-shortfall.ts <seed> 1 <placeKey>` lists no employer of this class paid nothing, and one paycheck is followed to its payer by record id.

**Files.** src/core2/opening-capital.ts, src/core2/data/opening-capital.json, src/core2/data/business-books.json

**Notes.** Found by Money measuring "no one paid twice or not at all" for queue item 1. Jobs owns what an employer pays; Money found it. Also unpaid in the same run: one media outlet job (press:television:3), earned 275,077, paid 0.
