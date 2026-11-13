---
id: words-filing-counter-one-scene
title: "The clerk's talk at the filing counter is its own move sequence, not one scene of the scene engine (SG-WORDS-filing-counter-prompts)"
area: words
kind: bug
priority: 2
size: M
status: claimed
standard: 2
claimed-by: Words builder W3
pr:
after: words-filing-petition-lines-carry-the-record
blocked-on:
lead: words
model: opus
effort: high
root: none
source: Fable A, Nov 13 04:04Z, 04:19Z and 05:03Z on #8928 (part 2 of the filing scene; both decisions given)
---

**What.** At the filing counter the clerk's talk before filing (the race told, the player's replies, the answers, the filing taken) is a move sequence hand-built in src/director/filing-visit.ts, not one scene of the scene engine, so the counter writes no reply record, its arc in purpose-arcs.json (`filing-clerk`) has no lines behind half its moves, and the clerk's lines about a rival who filed never play. `filing-counter-petition.test.ts` is red on main in Amherst, New Hampshire (GOLDEN_PATH_SEED=d2b6c96e34ca9f8d): the counter ends on the clerk's own accept and thank. Seen: the filing counter's talk box, in any drawn place.

**Cause.** Found in code: filing-visit.ts drives the talk itself (`RACE_MOVES`, `REPLIES`, `QUESTION_MOVE`, `filedAtCounter`) through `wordSceneMove`, instead of `composeSceneTalk` with the `filing-clerk` arc; the arc's replies (ask, tell, confront, leave, with agree only after an answer) do not match the pieces the bank holds (agree first; accept written after agree).

**Fix.** Fable A's rulings (Nov 13 05:03Z): (1) the `filing-clerk` arc becomes: state, the race told (the moves tell-running, tell-race, tell-duty and tell-deadline said in order as one statement, through an opt-in `stateMoves` on the arc); replies agree, ask, confront (only when the ballot holds a rival), leave; agree to accept, ask and confront to answer, then agree or leave again; ending `filed` opens `filing`. Moves the new arc does not use are deleted. (2) One `scene.reply` record per reply at the counter, the kind `replyInScene` writes, read by the next day's `filing` scene (the clerk never repeats herself) and the Journal, named by record id. The counter keeps its API (`chooseAtCounter`, `/api/filing/*`, `pick:`, `file`, `leave`); the race pick and a rule refusal stay screen steps. The talk after the pick is one `composeSceneTalk` tree; its ending `filed` files. The move sequence and SG-WORDS-filing-counter-prompts are deleted; the counter tests keep their intent against the exchange.

**Time box.** 4 hours

**Rules.** Replace, never layer: the move sequence is deleted in the same pull request, not kept beside the scene. No hand-written player text: every line is a bank part through the composer.

**Done when.** A second session, in a drawn place on main, files at the counter in the running game: the clerk tells the race, the replies are file, ask, (a rival) and leave, the filing ends the talk on the clerk's acceptance, a `scene.reply` record exists for each reply and the next day's `filing` scene reads it; `filing-counter-petition.test.ts` passes at GOLDEN_PATH_SEED=d2b6c96e34ca9f8d and a fresh seed; 1440x900 pictures of the counter before and after in three drawn places.

**Waits on.** #9008 (part 1, this branch is stacked on it).

**Files.** src/director/filing-visit.ts, src/director/scene-talk.ts, src/director/data/purpose-arcs.json, src/bench/filing.ts, src/bench/handler.ts, src/bench/play.mjs, data/english/parts/scene-talk.json, src/director/data/stopgaps.json, and the counter tests
