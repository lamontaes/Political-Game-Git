---
id: bench-ask-reading-own-dev-view
title: "The Ask out and Propose reading in dev mode moves to its own dev view"
area: play
lead: play-first
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: sonnet
effort: low
root: none
source: "Account lead, Nov 16 10:22Z, on #9256: dev-mode.ts additions move to src/bench/dev-views as a follow-up item"
checked:
---

**What.** #9256 added an `asks` reading to the person card's Records in dev mode (the gate for Ask out and Propose, the last answer's record, and the weight now with its terms) by editing `person()` in src/bench/dev-mode.ts. The lead's rule is that a new dev view registers from its own file in src/bench/dev-views/ and nobody edits dev-mode.ts for one. Seen: dev mode's person card, an "Asks" slot that shows why Ask out or Propose is open or closed and why the last answer was yes or no.

**Cause.** Found in code: `person()` in src/bench/dev-mode.ts returns `asks: askReading(...)` beside the Train's `laws`, added by #9256 before the dev-views rule reached that thread; src/bench/ask-out-card.test.ts reads `DevMode.person(other).asks`.

**Fix.** Write src/bench/dev-views/ask-reading.ts (a DevView with a route that returns the same askReading for a person) and src/bench/ui/ask-reading.mjs (a `slots.person` client), on the pattern of src/bench/dev-views/voter-lean.ts and src/bench/ui/voter-lean.mjs. Delete `asks` from `person()` in dev-mode.ts in the same change, and point ask-out-card.test.ts at the new route.

**Time box.** 2 hours for one Sonnet session.

**Rules.** Replace, never layer: the dev-mode.ts field is deleted in the same pull request. Every effect is traceable in dev mode (owner, Nov 16 00:59Z).

**Done when.** At a drawn place and seed, a second session plays a new life, asks someone out and is told no, opens dev mode on that person's card and sees the Asks slot name the gate, the answer's record with its weight and terms, and the weight now; dev-mode.ts no longer holds `asks`; ask-out-card.test.ts passes against the new route.

**Waits on.** #9256 folding into the Train.

**Files.** src/bench/dev-mode.ts, src/bench/ask-out-card.test.ts, src/bench/dev-views/voter-lean.ts, src/bench/ui/voter-lean.mjs, src/bench/dev-views/ask-reading.ts (new), src/bench/ui/ask-reading.mjs (new)

**Notes.** Filed Nov 16 on its own branch beside #9256, which is stamped and was not changed for it.
