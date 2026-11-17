---
id: world-signature-counts-off-the-screens
title: "The screens no longer show a count of petition signatures; the clerk and the talk say when there are enough"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude-world
pr:
blocked-on:
after:
lead: world
model: sonnet
effort: medium
root: none
source: Owner's Desk answer, Nov 16, 2026 ("Take every count off the screens. The clerk and the talk tell you when you have enough."), crew line #9747 item 6d
---

**What.** The campaign board, the doors outing result and the gatherers' line showed counts of petition signatures, such as "412 of 500" and "12 signed". The owner's answer is that the clerk and the talk tell the player when there are enough, with no count. Seen: owner playing, Nov 16.

**Cause.** Found in code: `src/bench/play.mjs` filled `{signed}` and `{needed}` into the campaign board's Signatures row and the doors' reason line, and printed `campaignResults.signed`; `src/bench/campaign.ts` added `{signed}` to the gatherers' line.

**Fix.** The labels in `src/bench/data/controls.json` carry no signature number (`signaturesHeld` is "Due {date}", `signaturesEnough` "Enough for the ballot"), `play.mjs` and `campaign.ts` no longer fill a count in, and the doors result no longer prints a signed count. The player sees only whether the petition is short or enough and when it is due.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** The `player-screen-text` rule applies: screens show record data only through worded labels, never raw counts the owner has ruled out. No dice: nothing in the simulation changes.

**Done when.** In a drawn place and a seed the builder did not choose, a filed petition's campaign board and a doors outing show no signature count, only short, enough and the due date; a second session sees it on the campaign board.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/campaign.ts, src/bench/data/controls.json

**Notes.** The reworded control strings are for Story to sign (World: for Story on #9747). Dev mode keeps its counts. A legislator's discharge petition line in the bill card (`committee-held-petition`) is a different count and is left for Screens to decide.
