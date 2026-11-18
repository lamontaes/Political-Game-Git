---
id: gov-chair-as-player-meets-sponsors-ask-by-presses
title: "A player who chairs the committee that held a bill meets the sponsor's ask, played by presses"
area: gov
kind: feature
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead, Nov 16: the chair-as-player case of the sponsor's ask was only partly played in #9630 and comes out of it"
claimed-at:
after:
lead: laws
model: sonnet
effort: medium
root: rc3-thin-life-record
---

**What.** When the player chairs the committee that held a bill, the sponsor's ask of the chair (`bill-held-chair`) is staged as a scene that stops the day (it is a scene, not a journal line, since #9630). It is not played by presses from day one, so what the chair's four replies do on the record is not shown. A player who chairs a committee cannot yet be shown to meet the ask and answer it. Seen: Texas (4846968, seed 8647-mason), lower seat 059, which chairs the committee that holds the upper 004 bill.

**Cause.** Measured: found in dev mode (Nov 16, Texas 4846968, seed 8647-mason, three runs to Feb 25, 2025): the hold is not suppressed by the player's seat. With no player and with the player set to lower 059 but advanced by `advanceCore`, the world writes the same hold on Feb 18. With the player stepped by `advancePlayerV1`, play stops on 2025-01-22 09:00 at `office-day.own-hearing` (`core2-office-day-v1`, `hold: true`): the player chairs a committee, and the engine never holds the chair's own hearing for them. A plain `stop` resume gets the same pause again, so the world never reaches Feb 18. The bench resolves that stop with `doEntry(api, entryId, { kind: "attend", attend })` (`src/bench/office.ts`).

**Fix.** The played test resolves each `own-hearing` stop through the bench's own attend action, the way a player presses it, then plays on to the hold and meets the ask.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice: the chair's recorded stand and the favor decide, and the engine never answers for the player. No answer without an outcome on record: the chair's yes in a second chamber says plainly it cannot reopen, or does something on record.

**Done when.** In a played world test at Texas (4846968, seed 8647-mason, buildBenchWorld) with the player in seat 059 from day one and each own-hearing stop attended through the bench's action, the hold occurs, the ask is met as a scene that stops the day, and each reply pressed leaves a record whose effect the test names; a second session on main sees the chair's ask in a place and seed it names.

**Waits on.** Nothing.

**Files.** src/director/hold-chair-sought.test.ts; src/bench/office.ts
