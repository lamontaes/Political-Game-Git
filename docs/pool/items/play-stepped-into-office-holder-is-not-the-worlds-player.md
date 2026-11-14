---
id: play-stepped-into-office-holder-is-not-the-worlds-player
title: "In an Advanced start the world's player id is not the person the player stepped into, so any record keyed on that id is lost for a stepped-into office holder"
area: play
kind: bug
priority: 2
size: M
status: open
standard: 2
after: play-executive-picks-the-member-to-ask
blocked-on:
lead: screens
source: Carry thread, Nov 14, 2026 (found by playing PR #9216 in a browser) and the coordinator's ask
model: opus
effort: medium
root: rc7-player-cannot-drive
checked: carrier thread 2026-11-14
---

**What.** A player who starts Advanced and steps into an office holder (a mayor, a governor, a council member) plays as a person who is not the world's player id, so every record a module keeps only "for the player" is dropped for that person, and tests that set the id by hand never see it. The class is every place that reads the world's player id where it means the person the player is, not the one case below. Seen: Advanced start, step in as the mayor of Ridgeville, Alabama (seed 3ce25319db8dc798de341066399b70e7baea6bfc0a3ff07fb957f8d73f740178), draft a bill, ask a member who says no, ask the same member again later, and the earlier no is not read back.

**Cause.** Found in code: `POST /api/play` in src/bench/handler.ts (around line 2677) calls `state.player.select(id)` (src/bench/player.ts line 82), which changes the bench's player but never `core.playerId`; the world's id stays as built (none in an Advanced start). `askToCarry` in src/core2/modules/legislature.ts (the `input.askerId === playerId` test near line 3508) therefore did not keep the player's own ask, which is why a declined ask (PR #9186) was not read back when played. PR #9216 fixed that one place by passing `byPlayer` from `seatAsk`. About 187 places in src/core2 and src/director read `.playerId` (people.ts, corruption.ts, public-action.ts, speech.ts, drives.ts, credit.ts, moves.ts, staff.ts, office-day.ts, work.ts and others); which of them mean "the person the player is" is not yet read.

**Fix.** Read every non-test `.playerId` in src/core2 and src/director and sort each into "the person the player is" or "the world's own start". For the first kind, prefer one answer over a flag on each call: either the stepped-into person becomes the world's player id when the player selects them (one place, `select`), if that is safe for the focus-person and record-keeping rules in src/core2/state.ts, or the modules read a single `playerOf(core)` the bench sets. Each place moved gets a test that does not set `core.playerId` by hand. Then remove the `byPlayer` flag from `askToCarry` and `proposeAsExecutive` in the same change, since the one answer replaces it.

**Time box.** 6 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: nothing names a place. Replace, never layer: one answer to "who is the player", not a flag per module. No dice. No new stopgap.

**Done when.** A second session, in the running game, starts Advanced at Ridgeville, Alabama (0164656, seed above), steps into the mayor, asks a member who says no, asks again 30 days later and reads the earlier no back with its date. Underneath: in an Advanced start at a named drawn place the player steps into an office holder and one record that was lost before is kept: the declined ask of an executive's bill at Ridgeville, Alabama (0164656) read back with the earlier date without `byPlayer`, shown by a pinned test that never sets `core.playerId`; and the list of every `.playerId` reader in src/core2 and src/director with its kind is in the PR body.

**Waits on.** PR #9216 folding into the train.

**Files.** src/bench/handler.ts, src/bench/player.ts, src/core2/state.ts, src/core2/modules/legislature.ts and the modules the reading finds

**Notes.** Look-first, Nov 14: searched docs/pool/items for "playerId" and "stepped into"; no item names this. Search method for the others: `grep -rn "\.playerId" src/core2 src/director --include=*.ts` and, for each hit, ask whether it means the person the player is; a hit inside a `table(...).put` guarded by it is a record that is silently dropped.
