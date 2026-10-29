---
id: realistic-elections-per-world
title: "The 2024 vote, turnout, party counts, poll support and sitting holders' shares open drawn per world"
area: core
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
---

**What.** Rows 42 and 44 to 48 of docs/reports/real-statistics-in-play-2026-10-27.md: the 2024 county vote, turnout and contested-state map; past vote totals; party counts in legislatures and Congress; national poll support; and one fixed winner's share per office kind, which shows every council member 'elected with 60% of the vote' (src/core2/data/offices/tenure.json, read at src/bench/government.ts:210). The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed. Each row names its file and reader so the fix lands in one place.

**Rules.** Estimate, never UNKNOWN: Each value starts from the published one as the center of a per-world spread drawn from the world seed at Start, tagged in its parameter table; filing rules, terms and dates are law and stay. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** In two played worlds on drawn places and seeds, each listed statistic differs between the worlds and from its published row, and no two council members share a printed vote share, named by record id; the guard covers it.

**Time box.** 4 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/core2/electorate-places.ts, src/core2/officials-president.ts, src/core2/past-elections.ts, src/core2/modules/officials.ts, src/core2/modules/offices.ts, src/core2/campaign-views.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.

Oct 28 (words and director session): evidence. The President is a Republican in 5 of 5 drawn worlds (seeds addr-a to addr-e), because officials are seated in the party that really holds the seat (officials-roster, partySource roster). The address now reads the party (its creed paragraph), so a party drawn per world would change the speech with no words code.

Oct 28 23:45 UTC (laws session): evidence. The two-seeds-differ guard (src/core2/realistic-not-real.test.ts, audit row 45, who holds the legislatures, Congress and the governorships) is red on clean main by draw: REALISTIC_SEED=210d38cd8a389651 draws Washington, District of Columbia (1150000) and fails with "seat:US-DC:us-house:98: expected 'Democratic' to be null"; the delegate seat opens in the party that really holds it. It turns `npm run guards` red on any PR whose run draws that place.
