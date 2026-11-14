---
id: director-scene-talk-second-reply-dropped-when-same-piece-comes-back
title: "A scene's second turn disappears when the reply it offers again comes back as the piece already offered, so the petition scene ends after one exchange"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
model: opus
effort: medium
root: none
source: found by the #9153 carry thread, Nov 14, tracing the `scene-talk.test.ts` depth red on train b7ed6337
lead: words
---

**What.** The `filing` scene (purpose `filing-petition`, the clerk's talk the day after a filing) is cut to one exchange. Its arc says the player may go on after the clerk's answer (`again.answer: ["leave"]`, `again.refuse: ["agree", "leave"]` in `src/director/data/purpose-arcs.json`) and the bank holds three `leave` replies for it, yet the composed tree has depth 1, so the "composes a tree" case in `src/director/scene-talk.test.ts` fails ("expected 1 to be greater than or equal to 2"). In play the player who asks the clerk a question gets the answer and then no reply to give: no way to say "Then I'll go start knocking on doors" and end it. The petition scene's replies were replayed in #9097; they are there, but only the first turn. Seen: the clerk's petition talk after filing, in a place with a petition.

**Cause.** Found in code: in `composeSceneTalk` (`src/director/scene-talk.ts`, the reply loop near line 1800, "A line already offered or said on this path is not offered again"), each node renders its reply moves with `render(..., seen)` and then `if (seen.has(reply.parts[zero])) return []`. At the second turn the `leave` move comes back as the same piece the root already offered (`scene-talk.reply-leave.i-ll-go-start-knocking-on-doors`, seen twice in a trace with a debug print at that line), so it is dropped and no gap is recorded (`gaps` is empty) because the render succeeded. Two other `leave` pieces and `agree` pieces exist and would pass; the render picks the same piece by the speaker's lean and the caller discards it instead of asking for another. It is neither the test (its depth count in `depthOf` is correct) nor a missing reply: the `filing-clerk` scene passes because its second-turn moves have more pieces and the hash lands on an unseen one.

**Fix.** In that reply loop, treat the pieces already offered or said on the path as excluded when rendering, so `render` takes the next-best unseen piece for the move; drop the `seen.has` discard, or keep it only as the last guard that records a gap. No reply is added and no line is changed to pass the test. Check that every purpose's tree depth and gap list still hold (`npm run words:composed -- --check`).

**Time box.** 2 hours.

**Rules.** No dice: the piece is chosen by the speaker's traits as before, excluding what was offered. One engine: the fix is in the one scene engine, never a per-purpose rule.

**Done when.** A second session composes the `filing` type and the "composes a tree" case in `src/director/scene-talk.test.ts` passes with depth 2 or more; plays the clerk's petition talk in two drawn places and asks a question, gets the answer, then has a second reply to give; names the places and seeds.

**Waits on.** Nothing.

**Files.** src/director/scene-talk.ts, src/director/scene-talk.test.ts

**Notes.** Filed by the #9153 carry thread, Nov 14, at the account lead's ask. Not built here: it is the shared scene engine, which other threads at the filing counter use.
