---
id: creator-portrait-blank-while-look-changes
title: "The creator's portrait goes blank for a moment every time the look changes"
area: play
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/pt-carryover-n16-9
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: Carryover screens, Nov 23 sitting (N16-9)
---

**What.** In the creator, picking a hair, head, top or color clears the portrait until the new look's pictures have all arrived, so the person flashes to an empty glow on every pick. Carried from the Nov 16 playtest as N16-9, "The portrait goes blank while the look changes".
Seen: Nov 23, a drawn place, creator at 1440x900, with each new bust picture delayed 350 ms: 39 of 123 samples had no visible portrait.

**Cause.** Found in code: `showLook` in src/bench/play.mjs replaced the portrait with a new `bustStack`, and `bustStack` in src/bench/ui/bust.mjs keeps its stack at opacity 0 (`.bust-stack.loading`) until every piece has loaded, so the old person was gone before the new one could show.

**Fix.** `bustStack` exposes `ready`, which settles when every piece is in. `showLook` keeps the old portrait up and swaps in the new one when `ready` settles; a later pick wins over an earlier one. No player text changes.

**Time box.** 1 hour, one Sonnet session at medium.

**Rules.** Wire to the world: the fix is in the one bust part, so every screen that swaps one person for another can use `ready`, and it adds no second renderer or player text.

**Done when.** In a played creator, with each new bust picture delayed, the portrait is never empty while a look changes: 0 blank samples in a drawn place at 1440x900. A second session starts a new game, picks a gender and then picks hair or a top in the running game, and sees the old portrait stay until the new one appears.

**Waits on.** Nothing.

**Files.** src/bench/ui/bust.mjs, src/bench/play.mjs

**Notes.**
