---
id: research-elections-filing-ballot-counts
title: "Filing deadlines, ballot order and House filing rules read from law, plus seller and polling place counts"
area: elections
kind: research
priority: 2
size: S
status: done
claimed-by:
pr: #5851
blocked-on:
source: "split Oct 24, 2026 from research-elections-sourced-parameters (PR #5851)"
claimed-at:
---

**What.** Reads law into the place tables the engines already use. Filing deadlines for Guam and Puerto Rico are SOURCED in src/core2/data/elections/filing-deadlines.json, and New York's party date (first Thursday in April) is read there but the row stays ESTIMATED, because independents file 24 to 23 weeks before the general election (May 19 to 26 in 2026) and the engine holds one date per state. In data/research/elections/filing-requirements.json, the U.S. House voter-registration rule is set false for the 50 states and Vermont's legislature minimum age is set to 18. In data/research/elections/ballot-order-2026.json, Pennsylvania's and Indiana's primary rows lose their estimate flag, and the Virgin Islands and the Northern Mariana Islands change to lot (still marked estimate). It adds two research files, data/research/elections/cbp-2023-campaign-sellers.json (County Business Patterns 2023 establishments for nine industries, all 56 places and by county) and data/research/elections/eavs-2024-polling-places.json (the EAC's 2024 EAVS precincts, polling places and early-voting sites for all 56 places, building kinds measured in one state and ESTIMATED elsewhere), read by scripts/research/elections-sources-check.ts and scripts/research/elections-year.ts. The replacements of `SG-GOV-campaign-pollster-seller`, `SG-GOV-campaign-mail-seller`, `SG-GOV-campaign-venue-seller`, `SG-GOV-polling-place-kind`, `SG-GOV-filing-deadline-estimate`, `SG-GOV-filing-fallbacks` and `SG-GOV-ballot-order-estimates` in src/core2/data/stopgaps.json are narrowed to what is left, and all seven stay open. A played year in Tarpon Springs, Florida (seed 2eadf2dbc7e6) reports each band and where the town landed. Split from research-elections-sourced-parameters, which stays open for the three seller rows and the polling-place row (mechanics waiting on builder items), the charter-place deadlines and ESTIMATED deadline rows, 35 registration rules that say not specified, and three territory ballot orders.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome. Estimate, never UNKNOWN: a row with no exact source is ESTIMATED with its source and spread, never invented, so the polling-place building kinds are ESTIMATED outside the one state measured. One rule, all 56 places: filing, ballot and count facts are per-place rows in data, never a state named in logic, and the played year draws its place from all 56.

**Done when.** (a) Each law row changed here carries its statute section and source URL (a rule of law has no spread), and each count table gives publisher, vintage and URL: filing deadlines for Guam and Puerto Rico (SOURCED) and New York (party date read, row ESTIMATED); the U.S. House registered-voter rule for the 50 states and Vermont's legislature minimum age; ballot order for Pennsylvania and Indiana (estimate cleared) and for the Virgin Islands and the Northern Mariana Islands (lot, still marked estimate); and the campaign-seller and polling-place counts for all 56 places, with building kinds ESTIMATED outside the one state measured. (b) Both new files under data/research/elections/ have a reader in scripts/research/elections-sources-check.ts and scripts/research/elections-year.ts, and the failure list of tests/guards/research-data-has-reader.test.ts names neither. (c) Each of the seven stopgaps named in What keeps its row in src/core2/data/stopgaps.json, narrowed, with a `replacement` naming the source read and the builder or research item that finishes it. (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, src/core2/tooling/calibration-guard.test.ts). (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports each band a year can show and where the town landed, with record ids, and names the seller bands as not observed when no campaign ran.

**Files.** src/core2/data/elections/filing-deadlines.json, data/research/elections/filing-requirements.json, data/research/elections/ballot-order-2026.json, data/research/elections/cbp-2023-campaign-sellers.json, data/research/elections/eavs-2024-polling-places.json, src/core2/data/stopgaps.json, scripts/research/elections-sources-check.ts, scripts/research/elections-year.ts

**Notes.** Split Oct 24, 2026 from research-elections-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5851 on branch claude/dreamy-tesla-bgi3ui-elections.

Sent back 2026-10-24 from PR #5851 (branch claude/dreamy-tesla-bgi3ui-elections): New York party April deadline is marked sourced and applied to independents whose May deadline has no override; wire the side-specific rule or retain the bounded gap and supply exact source URLs; finish on that branch, merge main into it first.

Fixer, Oct 24, 2026: New York's row retagged ESTIMATED (independent window not wired; remaining gap kept in SG-GOV-filing-deadline-estimate); the Guam, Puerto Rico and New York citations now carry page URLs.
