---
id: release-main-red-one-face-child-card
title: "The one-face browser check waits forever on People when the card it opens on is a child's"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-one-face-child-card
pr: 8978
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 13 (merger codex-4629 and the CTO on #8928, comments 6840749313 and 6840774568)
---

**What.** `node src/bench/one-face.browser.mjs` times out at People on clean main 0fe39561 in Wewoka, Oklahoma (4080550, life seed ee686ad3-4e3b-47ea-85d3-b0b141ec14b3): People opens on the player's four-year-old daughter, whose card rightly shows no portrait, and the check waits for one without condition, so none of its later assertions run. A merge desk running the browser checks of a screens pull request sees it whenever the household's first card is a child's. Seen: the check reaches its face assertions in every drawn life.

**Cause.** Found in code: `columnBust` in src/bench/ui/face.mjs draws a person with no face record (a child) as the empty `.mxglow` frame with no `.mxbust` inside, and src/bench/one-face.browser.mjs waited for `#sheet .mxbust .bust-stack` after opening People, which a child's card never has.

**Fix.** Check only: People is ready when a bust frame in the sheet shows (`#sheet .mxglow:visible`; a child's empty frame has no size and never counts as shown); every assertion is unchanged, and the household cards are still read one by one. The check also takes `SEED`, which replays a life's seed through the new-life request, so a place a run names can be played again.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: the check keeps drawing its state and town and names the place and seed. No assertion is loosened; the wait follows what a child's card really draws.

**Done when.** A second session runs the check against a fresh bench on main in Wewoka, Oklahoma with SEED=ee686ad3-4e3b-47ea-85d3-b0b141ec14b3 and in two drawn places it names, and each prints "PASS one face for the player on every screen".

**Waits on.** Nothing.

**Files.** src/bench/one-face.browser.mjs

**Notes (Red desk, Nov 13).** Sent back by codex-1251 at 41898e07: on main 587dd0be the first `#sheet .mxglow` is the child's empty frame, which Playwright counts as hidden, so the wait never ended (122 tries). The wait is now for a visible frame. Wewoka with SEED=ee686ad3-4e3b-47ea-85d3-b0b141ec14b3 fails with the old selector and passes with the new one on the merged result. The fresh draws Kingsland, Georgia (8f82b02f-4a08-43ec-bd93-402c412904c3) and Lane, South Dakota (fa1d19ae-5429-4034-b8b4-2adbb5b615b2) pass.
