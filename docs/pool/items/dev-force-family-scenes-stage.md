---
id: dev-force-family-scenes-stage
title: "Dev mode's proposal, breakup, move-in and rescue forces stage their scenes"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: Story lead's played-world proof of #10138, Nov 18
checked:
---

**What.** Dev mode can force a proposal, a breakup, a move-in ask and a rescue. None of them plays a scene: the force writes a record and the director stages nothing. Seen: dev mode's force list, pressing any of the four, then the day.

**Cause.** Measured: a proof session on Nov 18 forced each of the four at drawn places; each wrote a bare record naming only the player and returned "staged": false, "no-type" (scripts in /home/user/helpers/hwproof-scratch on that session, not kept). The forces do not call the engines' own writers: a breakup staged at once at Ten Sleep, WY (place 5675790, seed 0d8f47a0e8c167bf1654) when the partnership was ended through `setPartnersV1` together false, which wrote `family.separated:partnership_d220388866e3ac55:2025-02-19`.

**Fix.** Make each force call the engine writer that real play uses (the partnerships module for proposal and breakup, the household or residence writer for a move-in ask, the health engine's rescue record), so the record carries what the scene's packet reads, and the director stages the scene through its own scheduling. No hand-written record.

**Time box.** 2 hours.

**Rules.** Dev mode triggers every effect (owner, Nov 14): each of the four forces must run the same engine writer real play runs, so the scene it causes is seen and traced. No dice: the force decides nothing a person would decide.

**Done when.** A second session, in a drawn place, presses each of the four forces in dev mode and sees its scene staged the same day, with the Trace naming the record the engine wrote.

**Waits on.** Nothing.

**Files.** src/bench/dev-mode.ts, src/bench/dev-api.ts

**Notes.** Nov 18 (Story): found proving #10138.
