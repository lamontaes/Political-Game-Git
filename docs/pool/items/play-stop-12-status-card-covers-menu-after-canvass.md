---
id: play-stop-12-status-card-covers-menu-after-canvass
title: "After Knock on doors the status card covers the six menu icons"
area: play
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr: #6051
blocked-on:
source: added with npm run pool -- add
lead: play-first
milestone: play-first
claimed-at:
---

**What.** On the v0.22.10 release, after Knock on doors the status card bottom left adds "KNOCK ON DOORS · 36 DOORS · 5 REACHED", grows taller, squeezes my name to "Bo / Snider" and covers the six menu icons. Clicking where the Politics icon shows lands on the card, so no menu can be opened in the door-knocking scene; only Day or Week gets out. Once the campaign panel also stayed open after Knock on doors and hid Day and Week until I pressed ×. I expected the icons to stay clickable.

**Rules.** Serves LAW.md §1, Screens and menus. This is a game, not a spreadsheet: the player must always reach the menu in play. Replace, never layer: the status line belongs inside the card without a second layer over the icons.

**Done when.** The owner does the same steps on the next build and is not stopped: after Knock on doors, a mouse click on each of the six menu icons opens it, and the player's name stays on one line. Shown by a screenshot from the installed build in a drawn place, with the place and seed named.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** After knocking on doors, each menu icon opens with one click and your name stays on one line.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Files.** src/bench/play.css, src/bench/play.mjs

**Notes.** Playtest Oct 24 (docs/reports/playtest-2026-10-24.md). Release v0.22.10 (4c943f3), Anson, Texas, game seed 670bd1f7-66a4-4345-9ccd-98b9cdc7e213. Log 16:05, 16:12; screenshots 49, 61. Related to play-stop-card-covers-rings (priority 3), which saw the same overlap at a pending stop. Lead: play-first (acting CTO, Oct 24; docs/play-first/ORDER.md); was m0-m2.

Sent back 2026-10-25 ~22:05 UTC from PR #6051 (branch claude/quirky-ride-vrwwz4-play-stop-12, head 1d51fa6ef9 with main merged in): the body screenshot is wrapped in backticks so it renders as code, not an image, and OWNER SCREENSHOT NEEDED still awaits the owner's yes; unwrap the image tag and it goes back in the queue once the owner says yes; finish on that branch, merge main into it first.

Sent back 2026-10-26 from PR #6051 (branch claude/quirky-ride-vrwwz4-play-stop-12): Current-main integration conflicts in src/bench/card.browser.mjs and three card PNGs; reconcile the additional check/evidence with the dock layout already landed through #5971 and keep the separate #6083 wage port distinct, preserving installed-build acceptance as open.; finish on that branch, merge main into it first.
