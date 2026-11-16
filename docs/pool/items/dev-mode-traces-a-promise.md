---
id: dev-mode-traces-a-promise
title: "Dev mode lists a person's promises from the engine's rows and opens each in the Trace"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by: claude/promises-engine-dev-trace
pr:
after: core-promises-kept-and-settled-by-the-engine
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: Owner, Nov 16, 2026, 00:59Z ("all this stuff that you're tracing, if it's not already being traced by the dev mode, it should be being traced by that"); Account lead's plan approval the same night
checked: opus 2026-11-16
---

**What.** A promise's life (the reply that made it, its kind and the one owed, its last day, the records it waits on, and the record that ended it as kept, broken or lapsed) could be followed only by script or by reading code. The owner wants dev mode to show what sessions trace, so nobody has to read code to see it.
Seen: nothing under src/bench read the promises engine's tables on head 29d14ee15004d771f899c4b86ef5dcfbea38907d.

**Cause.** Found in code: src/bench/dev-mode.ts `person()` built a person's dev view from money, job, views, health, drives, relationships and the director's ledger, with no read of `core2-promises-v1`; src/core2/modules/promises.ts indexed promises only by pair and by last day, so no read could list one person's promises without a scan.

**Fix.** The engine indexes promises by who gave the word and who is owed it and exports `promisesOf(api, personId)`. Dev mode's person view lists them under `promises`, so the Records section on a person's card shows each row, and each id opens in the one Trace box already there (the trace finds the row in `core2-promises-v1.promises` and links the reply that made it). A promise is caused only by playing a scene whose ending keeps one (introduction, owed-apology, ask-vote, friend-ask, ask-to-serve, from src/director/data/promise-endings.json) and pressing that reply; nothing writes a row. Run until then runs the world past its last day. The loans half, each month's bill with its due day, amount, cash that morning and paid or missed, is dev-mode-shows-a-loans-monthly-bills, and this item does not build it.

**Time box.** 3 hours for one Opus session; push what passes and set the state honestly when it runs out.

**Rules.** Every effect can be triggered from the game's own code in dev mode and traced there: the promise is caused by the scene and the player's own press and traced from the engine's own row. Replace, never layer: dev mode reads the engine's rows and keeps no copy of its own, and the Trace it opens is the one box already there. Ask why: the Trace shows each ending's record, so why a promise was kept or broken is read in the game.

**Done when.** In the show-around test at Avon, North Carolina (seed promises-kept-and-broken-1, draw coworker:3) and its other pinned places, dev mode's person view lists the promise with how it ended and the Trace opens it with the reply that made it as a link. A second session, at a drawn place it names with its seed, plays a scene that keeps a promise in the running game, opens the person's card in dev mode, sees the promise listed, runs past its last day and sees how it ended and why in the Trace.

**Waits on.** core-promises-kept-and-settled-by-the-engine (#9568).

**Files.** src/core2/modules/promises.ts, src/bench/dev-mode.ts, src/director/promises.test.ts
