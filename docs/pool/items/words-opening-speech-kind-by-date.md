---
id: words-opening-speech-kind-by-date
title: "The opening's speech is chosen by date: the inaugural, the State of the Union in its season, otherwise an address from the Oval Office"
area: words
kind: feature
priority: 3
size: M
lead: words
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Owner, Oct 29 02:35 UTC (OWNER-DECISIONS): the inaugural on Inauguration Day, the State of the Union in its season, and otherwise a televised address to the nation from the Resolute desk in the Oval Office; this replaces the rule that every non-inaugural opening is a State of the Union. Today composeOpeningStory in src/director/opening-story.ts picks inaugural or state-of-the-union only, and the opening-speech bank (data/english/parts/opening-speech.json) has words for those two kinds. Every game starts January 20, 2025 (owner, Oct 14), so play shows the inaugural; the rule matters once an opening falls on another date.

**Rules.** One engine per mechanic: the season reads the federal calendar's joint address (src/core2/office-day-federal-calendar.ts), not a typed month. No hand-written player text in code. Every number in a parameter table.

**Done when.** composeOpeningStory picks among the three kinds by the federal calendar; the opening-speech bank words every role of the Oval Office address; a test composes openings on Inauguration Day, on the year's joint address date and on a summer date in a drawn place, naming the place, seed and the speech record id, and each plays its own kind.

**Files.** src/director/opening-story.ts, src/english/english-opening-speech.ts, data/english/parts/opening-speech.json

**Notes.** TODO
