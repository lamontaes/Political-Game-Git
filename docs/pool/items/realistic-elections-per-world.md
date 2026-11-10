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
after:
blocked-on:
standard: 2
model: opus
effort: medium
root: none
lead: m0-m2
source: owner, Oct 27, 5:40 PM Eastern ("realistic not real"); docs/reports/real-statistics-in-play-2026-10-27.md
---

**What.** Rows 42 and 44 to 48 of docs/reports/real-statistics-in-play-2026-10-27.md: the 2024 county vote, turnout and contested-state map; past vote totals; party counts in legislatures and Congress; national poll support; and one fixed winner's share per office kind, which shows every council member "elected with 60% of the vote". The owner ruled on Oct 27 that every non-law statistic starts realistic, not real, and differs in every world from the moment Start is pressed. Part is done: the sitting-holder vote share half is realistic-sitting-holders-vote-share and row 45 party counts are drawn per world; the 2024 county vote, turnout, past vote totals and national poll support remain.

**Cause.** Design: owner, Oct 27, 5:40 p.m. ("realistic not real") and docs/reports/real-statistics-in-play-2026-10-27.md rows 42 and 44 to 48, each naming its file and reader; src/core2/data/offices/tenure.json (read in src/bench/government.ts) holds the fixed winner's share.

**Fix.** Draw the 2024 county vote, turnout and contested-state map, past vote totals and national poll support per world from the published value as the center of a seeded spread tagged in the parameter table, so no two council members share a printed vote share.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: each value starts from the published one as the center of a per-world spread drawn from the world seed at Start, tagged in its parameter table; filing rules, terms and dates are law and stay. One rule, all 56 places: the draw and its spread come from data, never a named state, city or GEOID in logic.

**Done when.** A second session (not the builder) starts two worlds in drawn places and seeds (named) and finds that each listed statistic differs between the worlds and from its published row, and that no two council members share a printed vote share, named by record id; the guard in src/core2/realistic-not-real.test.ts covers it.

**Waits on.** Nothing.

**Files.** src/core2/electorate-places.ts, src/core2/officials-president.ts, src/core2/past-elections.ts, src/core2/modules/officials.ts, src/core2/modules/offices.ts, src/core2/campaign-views.ts, src/core2/realistic-not-real.test.ts

**Notes.** Filed by the realistic-not-real audit of Oct 27.

Oct 28 (words and director session): evidence. The President is a Republican in 5 of 5 drawn worlds (seeds addr-a to addr-e), because officials are seated in the party that really holds the seat (officials-roster, partySource roster). The address now reads the party (its creed paragraph), so a party drawn per world would change the speech with no words code.

Oct 28 23:45 UTC (laws session): evidence. The two-seeds-differ guard (src/core2/realistic-not-real.test.ts, audit row 45, who holds the legislatures, Congress and the governorships) is red on clean main by draw: REALISTIC_SEED=210d38cd8a389651 draws Washington, District of Columbia (1150000) and fails with "seat:US-DC:us-house:98: expected 'Democratic' to be null"; the delegate seat opens in the party that really holds it. It turns `npm run guards` red on any PR whose run draws that place.
