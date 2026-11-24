---
id: play-ui-look-adopts-four-impeccable-rules
title: "ui-look checks four more things Impeccable's rules name"
area: play
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: the CTO's line of Nov 24 ("adopt its rules, not its binary") after the manual Impeccable pass on five screens (comment 7135637502 on the crew's issue)
claimed-at:
after:
lead: play-first
model: sonnet
effort: medium
root: none
---

**What.** The menu look guard (`npm run ui-look`) catches a box in a box and a scroller with empty panel under it, but not a line of text cut through at a scroller's edge, the same date or bill number shown twice on one screen, a title that wraps at a tight line height, or a title laid over a picture it cannot be read against. The manual Impeccable pass found all four in the played game (the "FAILED" heading cut at the foot of Bills, a bill number three times on the Bills page, news headlines at 1.25 leading, the Bills banner title over a bright building). Seen: `npm run ui-look` in a drawn place lists each of the four kinds by menu and fails when a menu draws a new one.

**Cause.** Measured: with the Impeccable pass of Nov 24 in South Carthage, Tennessee, seed 03dee58a-a413-405e-9066-fe72b8977a23, on main 6ef9d585, the four kinds showed on News, Bills and Elections while `node src/bench/ui-look.browser.mjs` passed. The guard's scans (src/bench/ui-look-scan.mjs) know boxes and scrollers only, so nothing turns main red for a cut line, a repeated fact, tight leading or a low-contrast title.

**Fix.** Four scans in `ui-look-scan.mjs`, each a browser function like the first two: a line partly outside its clipping box; the same exact date or record number in two elements of one panel; a title (heading or headline class) wrapping to two lines or more with a line height under 1.3 times its size; a title over a picture whose box, photographed with its own text hidden, has more than 5 percent of pixels under 3:1 against the letters. Each has its own baseline kind in `tests/guards/ui-look-baseline.json` that only shrinks, and a planted-case self-test that runs before the menus open. No screen changes; the fixes are separate rows.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: the rules judge what a player reads and nothing else, no word or number is changed. Replace, never layer: the four scans sit in the one guard and the one baseline, not a second checker.

**Done when.** A second session runs `npm run ui-look` on main in a drawn place with the bench up and sees the planted-case line, a pass with each kind's hits listed in the baseline by menu, and a failure naming the kind, menu and selector when a planted hit is added to a screen; and the baseline lists every hit the drawn worlds found.

**Waits on.** Nothing.

**Files.** src/bench/ui-look.browser.mjs, src/bench/ui-look-scan.mjs, tests/guards/ui-look-baseline.json

**Notes.** Filed by Box and scroll (lane 2), Nov 24. The rules come from Impeccable's `text-overflow`, `repeated-container-text`, `tight-leading` and `low-contrast`. Its kicker rule is rejected (MENU-LOOK keeps the small tracked all-caps section labels).
