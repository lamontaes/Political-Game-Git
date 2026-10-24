---
id: play-stop-12-status-card-covers-menu-after-canvass
title: "After Knock on doors the status card covers the six menu icons"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
lead: m0-m2
milestone: play-first
---

**What.** On the v0.22.10 release, after Knock on doors the status card bottom left adds "KNOCK ON DOORS · 36 DOORS · 5 REACHED", grows taller, squeezes my name to "Bo / Snider" and covers the six menu icons. Clicking where the Politics icon shows lands on the card, so no menu can be opened in the door-knocking scene; only Day or Week gets out. Once the campaign panel also stayed open after Knock on doors and hid Day and Week until I pressed ×. I expected the icons to stay clickable.

**Rules.** This is a game, not a spreadsheet: the player must always reach the menu in play. Replace, never layer: the status line belongs inside the card without a second layer over the icons.

**Done when.** The owner does the same steps on the next build and is not stopped: after Knock on doors, a mouse click on each of the six menu icons opens it, and the player's name stays on one line. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Files.** src/bench/play.css, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:05, 16:12; screenshots 49, 61. Related to play-stop-card-covers-rings (priority 3), which saw the same overlap at a pending stop. Lead: m0-m2 (CTO, Oct 24; play-first order docs/work-orders/play-first-2026-10-24.md).
