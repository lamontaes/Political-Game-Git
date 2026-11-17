---
id: words-door-knock-rewritten-with-inserts
title: "The door knock says what the record holds: who signed, who else is running, where you stand, and the player answers with a reason"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by:
pr: 9846
after:
blocked-on:
root: rc4-hand-written-words
lead: words
model: sonnet
effort: medium
source: owner, Oct 28, "some scenes where you earn people's signatures ... signatures is the game's way of introducing you to campaigning", Oct 8, "porch scenes in a day of door knocking", and Nov 16, "No. Count them again and rewrite them with inserts", "either that or remove them and start fresh"
---

**What.** The door knock held 656 fixed lines under ask-signature and ask-support that no record placed: the same "Sure. Hand me the pen." at every door in every town, and a resident who "voted for you last time" with no voting record behind it. The door now asks from what the records hold and the resident answers from the petition or the knock, with a reason the resident's own life and the player's own stand back.
Seen: the player's petition circulates in a drawn place and the resident at each door signs or declines as the petition record says, in words that name the race, the day, the question the resident cares about or the other candidate.

**Cause.** Found in code: `excusedAs` in tests/guards/english/line-inserts.test.ts counts a line as placed when its use names any fact, and the ask-signature and ask-support pieces in data/english/parts/scene-talk.json carried only `excludesFacts: ["daytime"]` or nothing, so 303 of 406 and 353 of 476 lines were never counted as fixed text. `composeBinding` in src/director/purpose-scene.ts set no fact for the petition's answer, the other candidate, the player's own stand or the resident's last ballot, so no line could be placed by them.

**Fix.** Delete the door lines placed by nothing and those that state what no record holds, keep what a record places and that carries a slot, and write the families the spec names. Add `doorReads` in src/director/door-facts.ts, called from the door block of `composeBinding`: `signed` and `would-not-sign` (from `knockFacts` over `petitionAtDoor`), `rival` and `rival-signed` (the contest's other filing and its petition), `stand`, `stand-with` and `stand-apart` (the views engine, `viewOn`, on the resident's `view-question`), and `voted-last` and `sat-out-last` (the voting engine's ballot row for the last election of the office). Also set `filed-at-counter` from the clerk's counter record. Lower scene-talk's count in tests/guards/english/line-inserts-baseline.json once the recount lands.

**Time box.** 6 hours, Sonnet at medium effort.

**Rules.** No hand-written player text: every line is a bank piece placed by a fact the packet sets and none is typed in code. Wire to the world: each fact a door line needs is read from the petition, the contest's filings, the views engine or the voting engine's ballots, so a line plays only where its record holds.

**Done when.** In a drawn place, Town, State (seed nobody chose), a second session files for a local race in dev mode, canvasses through the campaign day while the petition circulates, presses every reply at a signature door and at a vote door, and finds the resident's answer is the petition record's by record id and a line that says the player's stand plays only where the views engine holds it. The line-inserts count for scene-talk is lower than before.

**Waits on.** The recount of the line-inserts count (#9757) before the count can fall.

**Files.** data/english/parts/scene-talk.json, src/director/door-facts.ts, src/director/purpose-scene.ts, src/director/door-ask-scene.test.ts, tests/guards/english/line-inserts-baseline.json, data/english/pulled.json, data/english/judged

**Notes.**

- 2026-11-17 (Story lead): drafted with a Sonnet writer. See the pull request for the counts, the played talks and the lines for the lead to sign.
