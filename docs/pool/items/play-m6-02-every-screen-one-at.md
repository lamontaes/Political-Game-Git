---
id: play-m6-02-every-screen-one-at
title: "M6-02 Every screen, one at a time"
area: play
kind: feature
priority: 3
size: L
status: blocked
claimed-by:
pr:
blocked-on: not scheduled: a roadmap milestone at priority 3 until the weekly reschedule (AGENTS.md: saves and release work wait for early-access preparation); an L item is split by whoever claims it once scheduled
milestone: M6
source: "docs/roadmap/later-specs-draft.md M6-02"
---

**What.** In the owner's order, after the opening: panel frame and style, person card (only what you could know), family (the owner's family-screen reference), conversation box (lower third, Lie button), government map, campaigns (no office list; you go to the filing office), calendar and time, journal, news, ledger, bill drafting on paper, desk and budget. (Owner: OPUS-PLAY.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** Each screen gets the owner's design approval, then a play-through in a random place.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Measured Oct 20 (claude, claude/political-game-pool-76ksvw) in a real browser, window 1672 by 941, new game, at the start and after a day (`src/bench/no-scroll.browser.mjs`): all eleven sheets (calendar, people, politics, news, journal, who, money, jobs, travel, guide, options) pass "no free scrolling": a sheet taller than its window pages through the pager (`pageIn` moves the box; its overflow is hidden) and shows the pager. My first run reported Politics (2,631 pixels) and Guide (611) as scrolling; that measured the paged content's height, which is not scrolling, and the two items I filed on it (`play-politics-sheet-scrolls`, `play-guide-sheet-scrolls`) are dropped. The owner's sign-off per screen, the Kit 12 and 13 look and the shell are not something a script judges.
