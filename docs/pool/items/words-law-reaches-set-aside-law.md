---
id: words-law-reaches-set-aside-law
title: "A law set aside, or a national law not kept, gets words when someone read about it"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "Words builder W2, Nov 13, the fourth case left out of #9045 (reviewer's condition)"
---

**What.** After #9045 the law-reaches tell has words for a law not yet in force and for another state's law. A law of the reader's own state that has been set aside or repealed, and a national law the engine does not keep in force, still have none. So the scene where a neighbor read about it is skipped, as all three cases were before #9045. Seen: a street stop or a call about a law in the news that never plays.

**Cause.** Found in code: `lawReachFacts` in `src/director/purpose-scene.ts` (new in #9045) returns no facts for a law row in the reader's own state, or at `US`, that is neither in force (`kept`) nor dated in the future. No tell line in `data/english/parts/scene-talk.json` for purpose `law-reaches` fits with neither `in-force`, `effective`, `lawstate` nor a `bill`.

**Fix.** Add a fact `set-aside` (the day the law stopped, from the law row or the laws engine's answer) and tell lines that require it, worded by Fable A ("It was struck down on {ended}." is a placeholder for her wording). Replies that would claim the law is lived with already exclude or require facts that keep them away.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Say what the record holds (Fable A, Nov 13). Every line through the English engine with inserts from the record. No line written until Fable A gives its words.

**Done when.** A second session finds a set-aside law row in a drawn world (place and seed named), calls `lawReachFacts` on it, and gets the new fact; and a tell line is worded from it naming the day.

**Waits on.** #9045.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/law-reaches-tell.test.ts (new)

**Notes.** Filed Nov 13 by Words builder W2.
