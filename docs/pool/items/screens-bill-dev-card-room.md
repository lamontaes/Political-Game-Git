---
id: screens-bill-dev-card-room
title: "A bill's page in dev mode keeps room for the bill's own sections"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: screens lane (Nov 17)
pr: 9790
blocked-on:
source: Laws and effects lane on the crew line, Nov 16
after:
lead: play-first
model: opus
effort: low
root: none
---

**What.** With dev mode on, a bill's page on Politics > Bills showed dev mode's card and almost nothing of the bill. The bill's columns, Where it is, The bill and What it would do, were squeezed to a few pixels under its picture. The Laws and effects lane saw it in Peridot, Arizona.
Seen: Politics > Bills with dev mode on, where the bill's columns stand 3 pixels tall.

**Cause.** Found in code: `src/bench/play.css` line 3054, the rule for a bill's page in a list, lets the bill shrink to nothing while dev mode's card under it (`devBillCard` in `src/bench/ui/dev-bill-card.mjs`) never shrinks below its own height.

**Fix.** In `src/bench/play.css`, give the bill the larger share of the page's height and dev mode's card the rest, each scrolling inside itself, wherever the card follows a bill. The player in dev mode sees it on every bill's page.

**Time box.** 1 hour for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Every effect can be triggered and traced in dev mode: the bill and its dev controls must both be readable on one page. One rule, all 56 places: the shares are one rule for every bill in every place.

**Done when.** A second session turns dev mode on in a drawn place, opens Politics > Bills, and reads the bill's three columns above dev mode's card, each column at least a third of the page's height.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/bill-dev-room.browser.mjs

**Notes.** Crew line #9747, reported by Laws and effects on Nov 16.
