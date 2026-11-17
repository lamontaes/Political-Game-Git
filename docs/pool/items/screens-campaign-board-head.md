---
id: screens-campaign-board-head
title: "The campaign board names its race, its election day and the money raised across the top"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: screens lane (Nov 17)
pr:
blocked-on:
source: crew line item 4, the campaign board mock (docs/mocks/2026-11-04), on the first-election path the CTO put first (Nov 17, 03:25Z)
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** Politics > Campaign opened on two sections and a button and never said which race it was. The approved campaign board (`docs/mocks/2026-11-04/campaign-board.png`) leads with a strip naming the office, the day it is decided and the money raised.
Seen: the board after filing, on main, beside the mock.

**Cause.** Found in code: `src/bench/play.mjs` line 2351, `campaignParts`, built the board as columns only; the race's title and election day the campaign route already sends were never shown.

**Fix.** A header part (`src/bench/ui/campaign-head.mjs`) over the board: the race's title, its election day in words and the money raised, large; Raised leaves the money column. The campaign checks' trail helper plays a scene that comes due after an act, so the checks reach the board's header and the trail again.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Screen to mock: a part in `src/bench/ui/`, named sizes. No new words: the labels are the board's and Elections' own. Signature counts stay off the board's header (owner, Nov 16).

**Done when.** A second session files for a race in a drawn place, opens Politics > Campaign and reads the race's office, its election day and the money raised across the top of the board.

**Waits on.** Nothing.

**Files.** src/bench/ui/campaign-head.mjs (new), src/bench/play.mjs, src/bench/play.css, src/bench/campaign.browser.mjs, src/bench/campaign-actions.browser.mjs, src/bench/campaign-trail.mjs, src/bench/campaign-season.browser.mjs

**Notes.** Crew line #9747. The mock's latest poll bar, standing and "What the race turns on" need records the board does not read yet.
