---
id: tests-wide-races-three-cases-red-on-train
title: "wide-races test: three cases fail on the Train at every place it drew, and it draws its place at run time"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: sonnet
effort: medium
source: views thread, Nov 16 (gate of the held-over seat change)
---

**What.** src/core2/wide-races.test.ts fails three of its seven cases on the Train at ef708196: the national pool of governors and statewide officers, the stand-in that may not add candidates to a wide race, and the edge fixture whose empty race should be a holdover. The test draws its seed with randomBytes and its places with drawPlace at run time, so each run plays different places, but the same three cases failed at both places seen. Nobody has traced why yet.
Seen: Parksley, Virginia (5160680), seed 722d272ef9f1615c, and Fort Meade, Maryland (2429400), seed cf0c570998e71b75, by `npx vitest run src/core2/wide-races.test.ts`.

**Cause.** Needs cause. Looked at: the run named under Seen, red on a clean checkout of the Train head ef70819622c9bc399e73c39e928c226e1f35afee and on the held-over seat branch alike, so the held-over seat change did not cause it.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** One rule, all 56 places: the test must name the places it plays, found once by script, never drawn at run time.

**Done when.** The three cases pass at named places and seeds written in the test, and a second session runs it on the train and sees all seven pass, then replays one case in a drawn place.

**Waits on.** Nothing.

**Files.** src/core2/wide-races.test.ts

**Notes.**

- Nov 16, views thread: failures read "expected [5646 rows] to deeply equal []" (national pool), "expected [2 rows] to deeply equal []" (stand-in) and "expected 'vacancy' to be 'holdover'" (edge fixture). Same three on the clean Train and on the held-over seat branch.
