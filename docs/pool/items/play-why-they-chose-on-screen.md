---
id: play-why-they-chose-on-screen
title: "A person's card says in a sentence why they made their last big choice"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from traits-end-to-end-proof)
lead: play-first
milestone: play-first
---

**What.** The traits work makes two people in the same spot choose differently for recorded reasons, and traits-end-to-end-proof shows it in a test. The player sees choices happen (a neighbor quits, a cousin runs) but never why. Add one sentence to the person card naming their most recent big decision and its leading reason, worded by the English engine from the decision record, so people read as people.

**Rules.** Serves LAW.md §11, The world on screen makes sense. No hand-written player text: the sentence is composed from the decision record's reasons by the English engine. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, after a played year, the card of a person with a recorded decision shows one sentence naming that decision and its leading reason, matching the decision record id in a test, shown by a screenshot with the place and seed named. The owner plays it: he sees it on a person card in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Click someone and read why they made their last big choice.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/card.ts, src/bench/words.ts

**Notes.** Filed by the Oct 25 pool audit: traits-end-to-end-proof's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with traits-end-to-end-proof (needs-from in the handoff line).
