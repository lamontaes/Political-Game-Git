---
id: play-browser-checks-name-deleted-opening-box
title: "Two browser checks still wait for the opening box that was deleted Oct 28: rates-named and framing"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Commit dcfc8aa74c (Oct 28 04:28, the opening's own scene system deleted) removed the #opening-box element and its speech list; four-screens.browser.mjs waited 120 s for it and timed out (fixed on branch fixer/red-main-browser-checks). src/bench/rates-named.browser.mjs (lines 36 to 62) and src/bench/framing.browser.mjs (lines 29 and 78, the Skip opening button) still wait for #opening-box or press Skip opening, so they cannot pass on main. rates-named also asserts the opening speech names the unemployment and other rates, which now play as a scene in the talk box, so it needs its reading moved to where the speech is told.

**Rules.** Replace, never layer: a check for a deleted screen is rewritten against its replacement or deleted, never kept waiting. One rule, all 56 places: draw the place and seed and name them in the PR body.

**Done when.** rates-named.browser.mjs and framing.browser.mjs pass against npm run bench on a drawn place named in the PR body with its seed, each reading the opening as the scene the game now plays and not the deleted box, shown by the run output of both checks

**Files.** src/bench/rates-named.browser.mjs,src/bench/framing.browser.mjs,src/bench/four-screens.browser.mjs

**Notes.** lead: play-first. Found by the standing red-main owner Oct 29 23:50 UTC while fixing four-screens.browser.mjs for the CTO. Read: OWNER-DECISIONS (Oct 28 opening scene system deleted), searched docs/pool/items for opening-box: none.
