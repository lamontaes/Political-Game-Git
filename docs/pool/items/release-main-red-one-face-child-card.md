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

**Fix.** Check only: People is ready when its roster is (`#sheet .roster-screen`, drawn by ui/roster-screen.mjs whoever the open card is; a child's empty bust frame has no size, so no frame need show); every assertion is unchanged, and the household cards are still read one by one. The check also takes `SEED`, which replays a life's seed, and `NEWLIFE`, which replays a whole new-life request's query as each run prints it.

**Time box.** 0.5 hours

**Rules.** One rule, all 56 places: the check keeps drawing its state and town and names the place and seed. No assertion is loosened; the wait follows what a child's card really draws.

**Done when.** A second session runs the check against a fresh bench on main in Wewoka, Oklahoma with the full creator request (River Henderson, born 1961-09-21: `NEWLIFE="seed=ee686ad3-4e3b-47ea-85d3-b0b141ec14b3&date=2025-01-20&placeKey=4080550&person=%7B%22givenName%22%3A%22River%22%2C%22familyName%22%3A%22Henderson%22%2C%22gender%22%3A%22female%22%2C%22birthYear%22%3A1961%2C%22birthMonth%22%3A9%2C%22birthDay%22%3A21%2C%22recipe%22%3A%7B%22person%22%3A%22woman-medium%22%2C%22hair%22%3A%22curls%22%2C%22hairColor%22%3A%22darkbrown%22%2C%22shirt%22%3A%22white%22%2C%22jacket%22%3A%22charcoal%22%2C%22top%22%3A%22henley%22%2C%22topColor%22%3A%22green%22%7D%7D"`) and in three drawn places it names, and each prints "PASS one face for the player on every screen".

**Waits on.** Nothing.

**Files.** src/bench/one-face.browser.mjs

**Notes (Red desk, Nov 13).** Sent back by codex-1251 at 41898e07: on main 587dd0be the first `#sheet .mxglow` is the child's empty frame, which Playwright counts as hidden, so the wait never ended (122 tries). The wait is now for a visible frame. Wewoka with SEED=ee686ad3-4e3b-47ea-85d3-b0b141ec14b3 fails with the old selector and passes with the new one on the merged result. The fresh draws Kingsland, Georgia (8f82b02f-4a08-43ec-bd93-402c412904c3) and Lane, South Dakota (fa1d19ae-5429-4034-b8b4-2adbb5b615b2) pass.

Sent back again at 92acb6e6 by codex-1251: with the full creator request (not the seed alone), People opens on Jason Henderson, son, age 3, whose only frame is 320 by 0, so no visibility wait can see it. The wait is now People's roster. On main merged in, that request fails with the old wait and passes with the new one. The fresh draws Hermitage, Arkansas (5c79b358-401f-45d2-9c85-2073af741bf4), China Town, Northern Mariana Islands (5ba24b0b-d5fb-4739-a7f3-956485505bc4) and Ector, Texas (728ab73d-78a7-4dc1-b67d-76fd35afe02b) pass.
