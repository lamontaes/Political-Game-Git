---
id: play-bill-estimate-has-no-reach-for-a-yes-or-no-law
title: "A bill on a yes-or-no law gives no estimate of who it would reach"
area: play
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: play-bill-page-says-the-same-sentence-three-times
blocked-on:
lead: laws
model: opus
effort: medium
root: rc10-screens-keep-own-facts
source: lead's walk of the screens train, Nov 11, 2026
checked:
claimed-at:
branch:
---

**What.** A drafted bill that turns a yes-or-no law on or off (a Medicaid work requirement, legal cannabis sales) shows no estimate of who it would reach or what it would cost them. A wage bill says how many workers get a raise and what it adds to pay; these bills say nothing. Seen: "What it would do" on the bill's page in Politics, Bills.

**Cause.** Found in code: `costOf` (src/core2/modules/legislature.ts line 1652) only prices wage steps (`wageStepCosts`) and returns 'no pay effect' for anything else, so a yes-or-no provision gets no estimate. The reader it needs exists, in two halves, and both run without the law in force because they read the world, not the law's records. Group A policies (src/core2/data/laws/reach-group-a.json, `POLICIES` in src/core2/law-reach/group-a-records.ts line 125): `targetsOf(api, spec)` (line 414) returns each reach spec's targets, full people one by one and counted people as one count by the same rule, and `applyRecords` (line 509) writes exactly those targets when the law takes effect. Group B policies (`groupBPolicy`, src/core2/law-reach/group-b.ts line 157): `reachOf` (line 192) over `selectResidents(townFacts(...), selector, stateKey)` (src/core2/law-reach/group-b-people.ts line 304) returns the named people and the counted total a selector covers; `runPolicy` (line 361) calls it per mechanic and writes the rows, with a few mechanics adding their own rule first (Medicaid: `medicaidCovered`, line 294). The finished bill's count (`lawReach`, src/core2/law-reach/applied.ts line 247) reads the rows those writers leave, so an estimate from the same selectors is the same count the record gives after the law takes effect.

**Fix.** 1. In src/core2/law-reach, add one exported read, `wouldReach(api, key)`: for a group-A key, the sum over `POLICIES[key].reaches` of `targetsOf` (named people, counted count, organizations); for a group-B key, the selection `runPolicy` would make for its mechanic, through `reachOf` (move the per-mechanic selection out of `runPolicy` into a function both call, so the writer and the estimate share it; Medicaid's `medicaidCovered` included). It writes nothing. 2. In `costOf`, for each `policy-question` provision call `wouldReach` and return `peopleCovered` (named plus counted) beside the wage fields, with a note naming the law. If importing law-reach into legislature.ts makes an import cycle, register the reader through src/core2/law-reach/host.ts the way policy handlers register. 3. The bill page's 'What it would do' (src/bench/legislature.ts and src/bench/ui/bill-paper.mjs) shows the count through a worded label; the words go through the Words session (the play-first lane's review rule). 4. A test in src/core2/law-reach (new file): in a drawn place, the estimate for a group-A and a group-B yes-or-no law equals `lawReach`'s people count on the day after the law takes effect.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN. One model, two tiers: the count covers counted people with the same rule as full people. A view never computes its own version of a fact.

**Done when.** The cause names the reader by file and function and says whether it can run on a law not yet in force, and the Fix is written so a builder can build it from the item alone. Once built: a second session, in the running game on main in a drawn place it writes down with its seed, opens a drafted bill on a yes-or-no law and sees under "What it would do" how many people the law would cover, the same count the law's own record gives after it takes effect.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/law-reach/group-a-records.ts, src/core2/law-reach/group-b.ts, src/core2/law-reach/group-b-people.ts, src/core2/law-reach/applied.ts, src/core2/law-reach/host.ts, src/bench/legislature.ts, src/bench/ui/bill-paper.mjs, src/core2/law-reach/would-reach.test.ts (new)

**Notes.** Split from play-bill-page-says-the-same-sentence-three-times by the lead, Nov 11, 2026.

Cause found (Nov 11, 2026, cause finder for Fable B): read `costOf` and the two reach groups' writers; each writer already computes its targets from the world before writing, so the estimate is that computation without the write.
