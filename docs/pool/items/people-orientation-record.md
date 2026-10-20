---
id: people-orientation-record
title: "Adults carry a recorded orientation, read when pairing, so who partners with whom follows each person's own record"
area: people
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
milestone:
source: split from people-partnership-counted by pool feeder Oct 20
---

**What.** Give each full adult a recorded orientation (who they can partner with), and have the partnership rules read it. Today no record in src/core2 holds one: the partnership PR (#4963) pairs only a woman and a man, which the owner ruled a defect on Oct 19 ("who pairs with whom reads each person's own record, including orientation"). The opening assigns it when it generates the household, consistent with the household's own makeup: the partners of every same-sex couple the ACS household tables (B11009) place in the household get a matching record, and everyone else draws it from the place's sourced adult shares by age, spread per world, by seeded generation of who exists. A counted adult carries no column for it; the counted tier uses the place's same-sex couple share as the group's weight, and a filled-in person takes the household's recorded partner and the group's share.

**Rules.** No dice: the record is seeded generation of who exists, consistent with the household already written; the partnership rules then read it with no chance step. Estimate, never UNKNOWN: a figure a player can see starts from the real average with a per-world spread, marked ESTIMATED with its source (ACS B11009, Gallup or Williams Institute adult shares). One model, two tiers: the counted tier reads the same shares times the group's count, and a full person filled in matches their household. One rule, all 56 places: shares come from place data with a state or national fallback. This is a game, not a spreadsheet: the record only changes who can pair; it is never a menu field or form. Replace, never layer: the woman-and-man-only pairing in the partnership forms code is deleted when this lands.

**Done when.** In a one-year run of the played world (buildBenchWorld, a place drawn from all 56 with a seed the builder did not choose, both named in the PR body) every adult has an orientation record by id, every opening partner link agrees with both partners' records, and the partnership forming rule (partnerships.ts) pairs two adults only when each record admits the other, shown for at least one same-sex pair formed in the year or a test case in src/core2/people-orientation.test.ts that names the place and seed.

**Files.** src/core2/opening-partnership.ts, src/core2/data/opening-partnership.json, src/core2/modules/partnerships.ts, src/core2/people-orientation.test.ts

**Notes.** Created by the pool feeder Oct 20 from the owner ruling of Oct 19 (OWNER-DECISIONS.md, "Pairing"). The partnership forms and ends PRs (#4963, #4970) carry the woman-and-man rule; whoever builds this replaces it there.
