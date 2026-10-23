---
id: gov-needs-officials-32
title: "Needs from other sessions listed in officials.md (line 32): 7 lines"
area: gov
kind: wiring
priority: 2
status: done
claimed-by: claude/gov-needs-officials-32
pr: #4529
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/officials.md "Needs from other sessions" (line 32)'
claimed-at: 2026-10-15T23:36:11.274Z
---

**What.** Seven requests from the officials session remain: an override roll call instead of counting passage tallies (`legislature.ts` `executiveAction`), the bench opening officials right after offices, presidential challengers that are still drawn stand-ins (`world-races.ts` `inaugurate`), a world-legislating wiring check, a state House filed as 35 seats when it has 70 members because each district elects an A and a B seat (the repro place is in officials.md), and the leader's own wants (`leanOf`). Each is a wiring job. Verify each on main, close what is built with a record id, and split the unbuilt ones. The player would notice paired-seat chambers showing every member, presidents who are the person who actually won, and vetoes overridden by a real vote.

**Rules.** One rule, all 56 places: the Idaho fix reads seat structure from data and names no state in code; An effect is a read, not a record: an override vote and a seated winner are each read by the engine that acts on them; No dice: the leader brings what their traits and wants say, never a party scale at a fixed number; Ask why: an override and an inauguration each keep the reasons by record id; Placeholders: SG-OFFICIALS-unrecorded-party closes only when the A and B seats match, not by deleting the row; Look before you ask: search docs/ for each line before opening a question.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body) (for the seat check, draw a place whose districts elect paired seats from data, not a named state): each of the seven lines in `docs/archive/2026-10-23/coordination/officials.md` line 32 is struck with the commit or record id, or has a pool item. The A and B seats of a paired-seat district show every member in the town's state votes, and a vetoed bill's override vote lists each member's vote. The owner plays it: reads who governs him in a paired-seat state and sees both House members of his district.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/offices.ts, src/core2/modules/officials.ts, src/core2/modules/world-races.ts, src/bench/world.ts, docs/archive/2026-10-23/coordination/officials.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
