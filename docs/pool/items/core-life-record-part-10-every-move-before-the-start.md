---
id: core-life-record-part-10-every-move-before-the-start
title: "The life record, part 10: a past holds every move by the moves engine's yearly rate, inside the county too, and a move is told once"
area: people
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: opus-lr
pr: #8933
after:
blocked-on:
lead: lives
model: sonnet
effort: high
root: design-life-record
source: gap sheet, Nov 12, 2026 (Fable A), filed by the Life records builder opus-lr
checked: opus-lr 2026-11-12
---

**What.** The owner, Nov 8: "None of my history is simulated." Most people's pasts hold no move at all, because the only move written before the start is one into the county, and one move can be told twice (gap sheet, Nov 12, row 16). Real Americans move many times, most of them inside their own county. Seen: a person's card and the Journal, which tell each move with a year.

**Cause.** Found in code: `src/core2/past-moves.ts` `moveRecords` (line 97) writes at most one `person.moved-in`, only for an adult whose parent or birthplace is outside the county (`originOf`, line 50), on the day their life-stage pull first reaches one whole move; someone who stayed in the county gets none, and nobody gets a second. Measured: in Smiths Station, Alabama (0171190), seed dupmoves01, with every resident's whole past opened, 5 of 193 residents have any move in their life; no one has two. `residenceOn` (line 247) reads only the first move. The twice-told move: `lifeOf` (`src/core2/person-life.ts` lines 449 to 476) pairs built and played twins for partners and births only, so a past `person.moved-in` and a played `housing.moved` or `person.moved-away` on the same place are never matched (inferred; one drawn world must name the two ids first).

**Fix.** Keep running the same yearly pull after a move: each time it reaches one whole move again, write another move, to another home in the same place or county (the ACS within-county share of movers by age, from the moves engine's own data, decides the share of moves that stay in the county; a move out and back is the existing pair). `residenceOn` reads the latest move at or before the day. Children at home move with the parent as now. In `lifeOf`, a past move and a played move to the same place in the same year are one event, the played one told. First find the duplicate's two ids in one drawn world and put them on the pull request.

**Time box.** 6 hours for one Sonnet session at high effort.

**Rules.** No dice: the pull builds from the person's age, children and state rate; the rate checks totals. One engine: the moves engine's rate, no second mover. Story writes the lines (`move/moved-in` already has pieces).

**Done when.** A test in three drawn places opens every town adult and prints the share with a move in the last year against the ACS rate for their ages (within its spread), the count with two or more moves, and no person whose life tells the same move twice. A second session opens five adults' cards on main in a drawn place and sees at least one with two moves, each with a year.

**Waits on.** Lines from Story for the spot the pull request names.

**Files.** src/core2/past-moves.ts, src/core2/person-life.ts, src/core2/data/moves/parameters.json
