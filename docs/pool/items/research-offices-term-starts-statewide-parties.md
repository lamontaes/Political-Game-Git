---
id: research-offices-term-starts-statewide-parties
title: "Governors' and legislators' term starts for all 56 places; every statewide party checked"
area: office
kind: research
priority: 2
size: S
status: open
claimed-by:
pr: #5859
blocked-on:
source: "split Oct 24, 2026 from research-offices-sourced-parameters (PR #5859)"
claimed-at:
---

**What.** Every state and territory now starts a new governor's term, and a new legislator's, on the day its own constitution or election law names, where before every legislator and the governors of 24 places started on January 1. src/core2/data/elections/term-starts.json gains 24 governor rows (20 SOURCED, 4 ESTIMATED), turns 17 ESTIMATED governor rows into 13 SOURCED and 4 ESTIMATED (one governor's day corrected), adds the text's URL to the 15 SOURCED rows, and adds a new stateLegislative family for all 56 places (46 SOURCED, 10 ESTIMATED), read by `termStartAfter` in src/core2/elections-calendar.ts and by `termEnd` in src/core2/modules/offices.ts. data/research/offices/statewide-executive-parties-2026.json now carries, for all 60 statewide officeholders never checked against a live page, its page, a quote and the holder on January 20, 2025 and January 1, 2026 (54 matched, 6 corrected), read by `statewidePartyOf` in src/core2/offices-state.ts. SG-GOV-statewide-parties-unverified is resolved, SG-GOV-term-end-estimate gets a rewritten `replacement` in src/core2/data/stopgaps.json, and scripts/research/offices-year.ts reports the played year. Split from research-offices-sourced-parameters, which stays open for SG-GOV-term-end-estimate for town and county offices.

**Rules.** Research calibrates, never decides: no source text reaches a player and no number picks one actor's outcome. Estimate, never UNKNOWN: a row with no exact source is ESTIMATED with its source and spread, never invented; a term-start row whose text sets no day says so and carries `estimatedFrom`. One rule, all 56 places: each place's start day is a row in src/core2/data/elections/term-starts.json, never a state named in logic. Replace, never layer: the SG-GOV-statewide-parties-unverified marker leaves `statewidePartyOf` in the same change.

**Done when.** (a) Each of these is SOURCED or ESTIMATED with a citation (publisher, year, URL), or, for a fact of law or record, quotes the fetched text with its URL (a start day or a party is a fact of law or record, so it has no spread): each governor's term-start row and each row of the new stateLegislative family in src/core2/data/elections/term-starts.json, and each of the 60 statewide officeholders' party rows in data/research/offices/statewide-executive-parties-2026.json, which carries its page, a quote and the holder on January 20, 2025 and January 1, 2026. (b) The changed research file data/research/offices/statewide-executive-parties-2026.json has a reader in src/core2/offices-state.ts and scripts/research/offices-year.ts (not tests or scripts/audit), and tests/guards/research-data-has-reader.test.ts lists none of this change's files. (c) SG-GOV-statewide-parties-unverified is resolved with its source named, and SG-GOV-term-end-estimate keeps its row in src/core2/data/stopgaps.json with a `replacement` naming the source of the state rows and what is left (town offices and county offices with no county calendar row). (d) The tripwire and calibration-guard tests pass (src/core2/tooling/tripwires.test.ts, calibration-guard.test.ts). (e) A one-year played world (buildBenchWorld, a place drawn from all 56, seed named in the PR) reports, for each office, the end of the term in progress, the row it comes from and the term record id (scripts/research/offices-year.ts). (f) src/core2/elections-law.test.ts and src/core2/term-start-history.test.ts pass, the history test checks each term's start against the row's own day, and three elections-law tests fail when run against main's term-starts data.

**Files.** src/core2/data/elections/term-starts.json, data/research/offices/statewide-executive-parties-2026.json, src/core2/offices-state.ts, src/core2/data/stopgaps.json, src/core2/elections-law.test.ts, src/core2/term-start-history.test.ts, scripts/research/offices-year.ts

**Notes.** Split Oct 24, 2026 from research-offices-sourced-parameters, after the merger's send-back of PR 5848 asked for a bounded item matching what a PR delivers. Delivered by PR #5859 on branch claude/dreamy-tesla-bgi3ui-offices.

Sent back 2026-10-24 from PR #5859 (branch claude/dreamy-tesla-bgi3ui-offices): Florida, Hawaii and Tennessee legislature rows tag an intentional one-day-after-election workaround SOURCED although their quotes say election day; implement the legal day or label/register the remaining estimate; finish on that branch, merge main into it first.
