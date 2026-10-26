---
id: play-official-ties-on-screen
title: "An official's card shows the colleagues they know and how well"
area: play
kind: feature
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: Oct 25 pool audit, on-screen pass (from gov-officials-legislators-know-no-one)
lead: play-first
milestone: play-first
---

**What.** Most state legislators and cabinet members open with no ties, and gov-officials-legislators-know-no-one gives them colleagues. When the player clicks an official, the card shows the office and no people. Add a Knows block to the person card listing the official's closest colleagues by name and office, with the tie in words (close ally, works with, rival), read from the tie records.

**Rules.** Serves LAW.md §11, The world on screen makes sense. This is a game, not a spreadsheet: three to five names in words, not a list of scores. Ask why: when the screen has nothing to show, it says why in plain words, never a code or an empty box.

**Done when.** In a drawn place on the bench, clicking a state legislator shows a Knows block whose names match that official's tie record ids in a test, or says they know no one yet, shown by a screenshot with the place and seed named. The owner plays it: he sees it on a person card in his own game without opening dev mode.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Click an official and see who they know in government.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/card.ts, src/bench/government.ts

**Notes.** Filed by the Oct 25 pool audit: gov-officials-legislators-know-no-one's Done when names no screen. Build the screen against what the engine gives today; when the engine side is thin, the screen says so in plain words. An engine change stays with gov-officials-legislators-know-no-one (needs-from in the handoff line).
