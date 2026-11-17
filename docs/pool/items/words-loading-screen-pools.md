---
id: words-loading-screen-pools
title: "The loading card shows a stream of dry lines about the machinery of government, one pool per step"
area: words
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: owner, Nov 17, verbatim on #9750 ("I don't like how boring the loading screen is... skimming a little off the top, closing alphabet agencies, legislating bureaucracy... things that are kind of sarcastic."); the CTO's note of 21:25Z
---

**What.** The loading card shows the step names and nothing else, and the "letting the world run two months" step sits for a long time. The owner wants a stream of short, dry, sarcastic lines about government and politics while each step runs. His three lines show the tone; they are not the list.
Seen: the owner's sitting on v0.113.0, Nov 17.

**Cause.** Design: the owner's words of Nov 17 on #9750 (docs/coordination/OWNER-DECISIONS.md, Nov 17). The controls bank (src/bench/data/controls.json) holds the step names only; no pool of lines exists for the card to cycle.

**Fix.** Story writes the pools into the controls bank: 15 to 25 lines per loading step to start, each step its own pool so the jokes fit what is being built (the economy, the elections, the budgets, the two months running), American English, no real people or parties named, nothing that punches at a group of voters, the joke always on the machinery. Menus (#9995) builds the cycling on the loading card from #10002 and reads every line from the controls bank; the real step names stay readable. The lines go through the register guard like every other control string.

**Time box.** 3 hours, the Story lead at medium.

**Rules.** No hand-written player text in code: the lines are bank entries the card reads. American English everywhere. The one list and detail part: the card reads the one controls bank, no second list.

**Done when.** A second session starts a new game on main and sees, during the two-months step, a new line every few seconds from that step's pool with no line shown twice in one load, the step names still readable; the Menus lane's before-and-after is on #9995.

**Waits on.** Menus' cycling on the loading card (#9995).

**Files.** src/bench/data/controls.json

**Notes.**
