---
id: research-territory-election-results
title: "Research: each territory's legislative, governor and delegate results and parties as electorate data"
area: elections
kind: research
priority: 3
size: L
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10 (SG-GOV-territory-legislature-race)
lead: researcher
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
---

**What.** Puerto Rico, Guam, the Virgin Islands, American Samoa and the Northern Marianas have no counted electorate, so their legislatures, governors and other elected officers are never raced in the world and their holders serve past their terms. Find each territory's certified 2024 results by electoral unit (legislative district or at large, governor, delegate), the parties that field candidates (Puerto Rico's New Progressive and Popular Democratic, for one; American Samoa's nonpartisan Fono), and each office's election year, so a later build can race them on the same counted engine.

**Cause.** Found in code: `src/core2/modules/voting.ts` lines 5014 to 5024 skip any non-House seat whose place fails `countedPlace` (line 4264), because `statePlaces` in `src/core2/electorate-places.ts` (line 300) builds a territory place only when given an eligible count and only from the delegate row; no territory has legislative or governor results or its own parties on record.

**Fix.** For each territory, fetch the election commission's certified 2024 results (and the 2022 or 2026 results where the cycle differs), quote the page, and write `data/research/elections/territory-results.json` with votes by unit and party, each row tagged SOURCED with a citation and retrieval date, or ESTIMATED with its source and spread where only press summaries exist. Record which seats are nonpartisan and which parties are not the two major ones. Build nothing; the build item (race the territories through `racesIn` and `openSpecialRace`, then resolve `SG-GOV-territory-legislature-race`) is filed when this lands. Reuse, do not repeat, the work in elections-stopgap-past-elections-missing-data and core-stopgap-world-races-missing-data.

**Time box.** 6 hours for one sonnet session.

**Rules.** Research before building: every figure quoted from a fetched page, none from memory. One rule, all 56 places: territories are data rows, no territory named in logic. Estimate, never UNKNOWN. Real results calibrate the count; they never decide one actor's outcome.

**Done when.** A second session, for two territories drawn at random (name them and the seed), opens `data/research/elections/territory-results.json`, picks two territories it chose, and for each finds every figure's cited page, year and unit, the party list and the seat-by-seat nonpartisan flags; five territories are present or each absence names its blocker. The follow-up build item is filed with the file's path.

**Waits on.** Nothing.

**Files.** data/research/elections/territory-ballots.json, data/research/elections/house-delegates-2024.json, src/core2/electorate-places.ts, src/core2/data/stopgaps/gov.json
