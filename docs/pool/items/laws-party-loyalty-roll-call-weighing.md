---
id: laws-party-loyalty-roll-call-weighing
title: "Weigh each state chamber's loyalty multiple against its own public roll calls"
area: laws
kind: research
priority: 3
size: M
status: blocked
claimed-by:
pr:
blocked-on:
after: laws-party-loyalty-roll-calls
source: added with npm run pool -- add
---

**What.** laws-party-loyalty-roll-calls calibrates how far a state legislator follows their party from each legislature's public roll calls. This item weighs each state chamber's loyalty multiple against its own roll calls: from the roll-call tabulation that item produces, compute each chamber's observed party-unity rate, compare it with what the simulated chamber produces (src/core2/party-loyalty.test.ts measures the simulated chambers; the weight is weights.statePartyLoyalty in src/core2/modules/officials.ts and partyLoyaltyWeight in src/core2/modules/voting.ts), and set a per-chamber multiple in a data table, SOURCED to the roll calls with the years used or ESTIMATED with a spread where a chamber publishes none. The per-chamber multiple replaces the one shared weight.

**Rules.** Research before building: every multiple cites the roll-call source and years, and real unity rates check the chamber's total and never decide a member's vote. No dice: a member's vote still follows their own views, party, district and the bill, with the multiple only scaling the party term. Sliding scales and causes: the multiple scales a pull and never forces a vote at a cutoff. One rule, all 56 places: the table has every chamber, and no state is named in code. Estimate, never UNKNOWN: a chamber without roll calls starts from the national average with its spread. Replace, never layer: the single shared multiple is deleted.

**Done when.** In a one-year run of the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose, the state chamber's share of party-line roll calls lands inside the spread around its sourced party-unity rate, shown by the chamber vote record ids and the chamber's table row; src/core2/party-loyalty.test.ts covers it, every chamber row cites its source, and SG-LAWS-state-party-loyalty-target is resolved in src/core2/data/stopgaps.json.

**Files.** src/core2/modules/officials.ts, src/core2/modules/voting.ts, src/core2/data/campaigns/party-loyalty.json, src/core2/party-loyalty.test.ts, src/core2/data/stopgaps.json

**Notes.** Oct 20 (pool feeder): spec written; it needs the roll-call tabulation from laws-party-loyalty-roll-calls (in a PR), so the data file name here may follow whatever that PR names. The owner's Oct 15 ruling lets his own state roll-call input calibrate one parameter with nothing shipped; this item's per-chamber table must therefore hold only public roll-call rates, never the Shor-McCarty values. The sent-back note on the parent about SG-LAWS-state-party-loyalty-target (resolve, never delete) applies here too.
