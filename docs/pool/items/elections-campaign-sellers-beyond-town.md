---
id: elections-campaign-sellers-beyond-town
title: "Campaigns buy polls, mail and halls from recorded sellers beyond the town"
area: elections
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** A campaign that buys a poll, a mailing or an evening's hall pays a stand-in seller created in town whenever the town records no business of a fitting kind (SG-GOV-campaign-pollster-seller, SG-GOV-campaign-mail-seller, SG-GOV-campaign-venue-seller). Census County Business Patterns 2023 publishes polling firms in only 260 of 3,246 county equivalents and mail houses in 166, so the stand-in is paid in most towns. Read data/research/elections/cbp-2023-campaign-sellers.json in seller(): the town's own business first, then a recorded firm for the county or the state built from the place's counts, and pay a mailer's postage to a Postal Service organization rather than to the printer. For venues, record the town's own halls (a school gym, a community center) as places a campaign rents before any stand-in. Delete the stand-in seller and its three stopgap markers in the same change.

**Rules.** Wire to the world: the campaign's money must land on a recorded seller organization whose books another engine reads, never a stand-in, in all 56 places. One rule, all 56 places: the seller lookup reads per-place counts from the research file, never a state named in code.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named in the PR), every campaign poll, mailing and event pays a recorded organization that is not a stand-in, named by record id, with postage on a Postal Service organization's account; core.stopgapHits holds none of the three seller stopgap ids; src/core2/campaigns.test.ts passes.

**Files.** src/core2/modules/campaigns.ts, data/research/elections/cbp-2023-campaign-sellers.json

**Notes.** TODO
