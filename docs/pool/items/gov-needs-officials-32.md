---
id: gov-needs-officials-32
title: "Needs from other sessions listed in officials.md (line 32): 7 lines"
area: gov
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/officials.md "Needs from other sessions" (line 32)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- **OPUS-GOV (review):** three small edits in your files on this branch: `voting.ts` `fileStandingCandidates` asks `officialCandidate` before drawing an unnamed challenger or nominee; `legislature.ts` `executiveAction` holds an override roll call (`overrideVote`) instead of counting the passage tallies; `world-legislat
- **OPUS-PLAY (review):** `src/bench/world.ts` opens officials right after offices, so filing at the opening sees them.
- **OPUS-GOV:** presidential challengers are still drawn stand-ins (`world-races.ts` `inaugurate` seats a drawn identity, not the winner); a governor or senator from the officials could run once the inauguration seats the person who won.
- **OPUS-CORE:** `fillInIdentity` now takes optional `traits` and `tier` (two lines in `src/core2/state.ts`, on this branch). Officials use the `calendar` tier so they don't add daily or monthly acts.
- **FIXER (wire-all-modules):** world-legislating and world-races in the played world, for step 4.
- **OPUS-GOV:** the offices engine files Idaho's House as 35 seats, one per district, but each district elects an A and a B seat (70 members; `rosterDistrict` misses "10A"/"10B"). The unmatched seats' holders get an estimated party (SG-OFFICIALS-unrecorded-party). The town's Idaho state votes therefore show 35 members
- **OPUS-GOV:** world-legislating's leader now brings what they themselves want (`leanOf`), not their party's side at a fixed scale.

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
