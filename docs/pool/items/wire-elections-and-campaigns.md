---
id: wire-elections-and-campaigns
title: "One election engine: one ballot, one result writer, one term writer for every race at every level; election night, campaign standing and candidacy read it"
area: elections
kind: feature
priority: 1
size: L
status: claimed
claimed-by: claude/wire-elections
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T05:24:55.314Z
---

**What.** Engine map lines 20 to 24. src/core2/modules/voting.ts and src/core2/modules/world-races.ts share one ballot, one result writer and one term writer through src/core2/electorate.ts and src/core2/modules/offices.ts. Election night reads a returns record the voting engine keeps, not a sequence rebuilt per call. Campaign standing (contestCauses, raceStanding, whyNot) moves from the bench into the campaign engine (campaignDayChoices, src/core2/campaign-day.ts:250; src/core2/campaign-views.ts). src/core2/modules/candidacy.ts is installed in every world and the voting engine's stand-in filing is deleted. The adult and voting age are one row in src/core2/data/elections/parameters.json (add the row; today the number is typed at 49 module sites and in the director) read at every site. Time box: 6 hours.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. One engine per mechanic and the simulation as the one layer (AGENTS.md first bullet). No new mechanic (AGENTS.md step 0): a missing piece is a registered stopgap naming the engine. Every cut corner a registered stopgap. The guards on main (npm run guards, sixteen ids in scripts/guards/index.ts) pass on every PR; a shrinking baseline is lowered in the same PR. Sessions never message; the channel block and PR bodies are the record. One PR per line; mergers merge on green; a golden-path red that reproduces on clean main does not block. Guards: families, no-second-source, two-seeds-differ, no-dice.

**Done when.** In two drawn places (name them and the seeds), a town, a state and a federal race run through the one result writer and one term writer, by record id; the election-night screen shows the result the returns record holds; the stand-in filing and the second writers are gone (grep named); the age row exists and no module types the number (grep named).

**Files.** src/core2/modules/voting.ts,src/core2/modules/world-races.ts,src/core2/electorate.ts,src/core2/modules/offices.ts,src/core2/modules/candidacy.ts,src/core2/campaign-day.ts,src/core2/campaign-views.ts,src/core2/data/elections/parameters.json,src/bench

**Notes.** Filed by the CTO from the engine map on the owner's go (Oct 28). engine: electorate.ts, offices.ts, candidacy.ts, campaign-day.ts. guard: families, no-second-source, two-seeds-differ. Read: OWNER-DECISIONS (one engine per mechanic), the engine map (E1, E2, N1, X3, W5). Starts wiring when the Trim block says the campaign deletions landed.
