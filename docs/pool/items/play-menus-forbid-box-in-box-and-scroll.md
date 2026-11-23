---
id: play-menus-forbid-box-in-box-and-scroll
title: "Nothing fails when a menu draws a box inside the panel or scrolls with free space"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: owner sitting 2026-11-23-1, P33 and P37
claimed-at:
after:
lead: play-first
model: sonnet
effort: medium
root: none
---

**What.** The owner, Nov 23: "a box around boxes for announce and sim. What is up with these box in the boxes? ... find out why it keeps happening, and explicitly forbid it. Make it turn main red", and "none of these scrollers, especially when there's ample dead space in these menus". Two rules written in MENU-LOOK (no box around items, menus never scroll as a page) had no check that could fail, and no workflow ran a browser. Seen: the race screen's Announce and Sim buttons sit on the panel with no frame around them, and no menu at 1440x900 scrolls while it has free space.

**Cause.** Found in code: `buttonTray()` in src/bench/ui/button.mjs, written from the owner's Oct 29 "framed plates" answer, drew `.tray, .record-actions` in src/bench/play.css (a dark gradient, a brass border and an inset shadow) around the buttons of five screens (src/bench/play.mjs lines 2500, 4748, 5622, 6633, 6637; the race screen is 5622). His Nov 5 "no boxes" ruling replaced that answer, and the new rule was written into MENU-LOOK, LAW.md and the screen-to-mock skill, but the old part was never deleted and no check failed when a screen used it. The existing guards read css text (tests/guards/panel-look.test.ts) or imports (kit-only-ui.test.ts), never the drawn page; browser.yml was deleted on Oct 24 (.github/workflows/validate.yml line 3), so no job opened a menu.

**Fix.** Delete `buttonTray()` and the `.tray, .record-actions` rules, so buttons sit on the panel in `buttonRow`. Add src/bench/ui-look.browser.mjs and its scans (src/bench/ui-look-scan.mjs): at 1440x900 it opens every menu and fails a non-control container with a border on two sides or more, a fill or an inset shadow inside the framed panel (guard A), and any scroller inside a panel that is shorter than the height the screen allows it (guard B). tests/guards/ui-look-baseline.json lists what remains by menu and selector and only shrinks. A `ui-look` job in .github/workflows/validate.yml runs it on every pull request and on main's hourly run, and the aggregate `validate` job fails when it fails.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Screen to mock: MENU-LOOK, "No box around every item" and "Menus never scroll as a page". Replace, never layer: the tray is deleted with its call sites. No loosened check: the baseline only shrinks.

**Done when.** A second session runs `npm run ui-look` on main with the bench up: it passes; puts the tray back and empties the baseline and it fails naming `div.tray` on the race screen; opens the race screen at 1440x900 in a drawn place and sees Announce and Sim on the panel with no frame.

**Waits on.** Nothing.

**Files.** src/bench/ui/button.mjs, src/bench/play.css, src/bench/play.mjs, src/bench/ui/screen.mjs, src/bench/ui-look.browser.mjs, src/bench/ui-look-scan.mjs, tests/guards/ui-look-baseline.json, .github/workflows/validate.yml, package.json

**Notes.** Filed by Box and scroll (lane 2) in the PR that builds it, Nov 23.
