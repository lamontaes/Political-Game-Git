---
id: elections-campaign-sellers-beyond-town
title: "Campaigns buy polls, mail and halls from recorded sellers beyond the town"
area: elections
kind: feature
priority: 3
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
checked: fable 2026-11-10
---

**What.** A campaign that buys a poll, a mailing or an evening's hall pays a stand-in seller created in town whenever the town records no business of a fitting kind (SG-GOV-campaign-pollster-seller, SG-GOV-campaign-mail-seller, SG-GOV-campaign-venue-seller). Census County Business Patterns 2023 publishes polling firms in only 260 of 3,246 county equivalents and mail houses in 166, so the stand-in is paid in most towns. The seller lookup should read the town's own business first, then a recorded firm for the county or the state built from the place's counts, pay a mailer's postage to a Postal Service organization rather than to the printer, and rent the town's own halls (a school gym, a community center) for venues before any stand-in.

**Cause.** Found in code: `seller` (`src/core2/modules/campaigns.ts` line 1652) pays a stand-in when the town has no business of the kind; the stopgaps SG-GOV-campaign-pollster-seller, SG-GOV-campaign-mail-seller and SG-GOV-campaign-venue-seller are open in `src/core2/data/stopgaps/gov.json` (lines 99 to 123). The county counts are in `data/research/elections/cbp-2023-campaign-sellers.json`.

**Fix.** Read the town's own business first, then a recorded firm for the county or state built from the place's counts, pay postage to a Postal Service organization, rent the town's own halls for venues, and delete the stand-in and the three stopgap rows.

**Time box.** 6 hours for one Sonnet session.

**Rules.** Wire to the world: the campaign's money must land on a recorded seller organization whose books another engine reads, never a stand-in, in all 56 places. One rule, all 56 places: the seller lookup reads per-place counts from the research file, never a state named in code.

**Done when.** A second session plays one year of buildBenchWorld in a drawn place from all 56 (name and seed written down) with the player running a campaign, and finds every campaign poll, mailing and event paying a recorded organization that is not a stand-in, named by record id, with postage on a Postal Service organization's account. `core.stopgapHits` holds none of the three seller stopgap ids and `src/core2/campaigns.test.ts` passes.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, data/research/elections/cbp-2023-campaign-sellers.json, src/core2/data/stopgaps/gov.json, src/core2/campaigns.test.ts

**Notes.** TODO

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would pay a county or state polling firm built from Census business counts instead of a stand-in seller; the player only sees what the poll or mailing cost.
