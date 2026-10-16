---
id: laws-party-loyalty
title: "Party loyalty in state chambers"
area: elections
kind: owner-decision
priority: 2
status: open
claimed-by:
pr: #4542
blocked-on:
milestone:
source: "overnight pool item 12; reissue closed note"
claimed-at:
---

**What.** State-chamber members vote with their party at rates the game does not calibrate, because the best data (Shor-McCarty) is non-commercial and the license question was parked. The owner ruled on Oct 15 that it may calibrate the state-chamber party-loyalty parameter, with nothing shipped and no citation: one calibration input weighted against roll calls. Build that: a single parameter in the parameter table, tagged ESTIMATED, that the legislature module's vote decision reads, set by comparing simulated chamber loyalty against sourced roll-call loyalty. The player would notice state legislators who cross party lines about as often as real ones do.

**Rules.** Research before building: the calibration input is used to set one parameter; no Shor-McCarty data or citation ships in the repository or the credits; No dice: loyalty enters each member's reasons with traits, relationships and the interest groups reaching them; it never decides a vote by percentage; Estimate, never UNKNOWN: the parameter is tagged ESTIMATED with source and spread, never UNKNOWN; One rule, all 56 places: the parameter is one value per chamber type from data, with no state named in code; Owner decisions are flagged, never waited on: the license ruling is in OWNER-DECISIONS.md; quote it and do not reopen it; Look before you ask: read DECISION-REGISTER.md first; this question is answered.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): simulated party-line voting in a state chamber falls within the target spread of roll-call loyalty (name the chamber, the measured share and the spread), the parameter sits in the parameter table with its tag, and `tests/data-tables.test.ts` or the legislature test checks that no restricted source is cited or shipped. The owner plays it: watches his state legislature split along party lines on most but not all votes.

**Files.** src/core2/modules/officials.ts, src/core2/modules/parties.ts, src/core2/modules/legislature.ts, src/core2/data/legislature/

**Notes.** Owner ruling (Oct 15): Shor-McCarty may calibrate the state-chamber party-loyalty parameter; nothing ships, no citation; one calibration input weighted against roll calls.
