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
after:
standard: 2
model: sonnet
effort: medium
root: rc4-hand-written-words
checked: fable 2026-11-10
---

**What.** Owner, Oct 29 02:35 UTC (OWNER-DECISIONS): the inaugural on Inauguration Day, the State of the Union in its season, and otherwise a televised address to the nation from the Resolute desk in the Oval Office; this replaces the rule that every non-inaugural opening is a State of the Union. Today composeOpeningStory in src/director/opening-story.ts picks inaugural or state-of-the-union only, and the opening-speech bank (data/english/parts/opening-speech.json) has words for those two kinds. Every game starts January 20, 2025 (owner, Oct 14), so play shows the inaugural; the rule matters once an opening falls on another date. Seen: the opening speech, an inaugural, a State of the Union or an Oval Office address by date (ruled Oct 29).

**Cause.** Found in code: composeOpeningStory in src/director/opening-story.ts (line 1111) chooses "inaugural" or "state-of-the-union" only, and OpeningSpeechKind (src/english/english-opening-speech.ts, line 52) has no televised-address kind; the owner's ruling of Oct 29 (docs/coordination/OWNER-DECISIONS.md) is the inaugural on Inauguration Day, the State of the Union in its season, otherwise an address from the Oval Office.

**Fix.** Add the third kind and pick among the three from the federal calendar (src/core2/office-day-federal-calendar.ts), with its pieces written by Story.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: the season reads the federal calendar's joint address (src/core2/office-day-federal-calendar.ts), not a typed month. No hand-written player text in code. Every number in a parameter table.

**Done when.** A second session, not the builder, composes openings in a drawn place from all 56 (place and seed named) on Inauguration Day, on the year's joint address date and on a summer date, and each plays its own kind, shown by the speech record id in a test; the Oval Office kind has a graded piece for every role.

**Waits on.** Nothing.

**Files.** src/director/opening-story.ts, src/english/english-opening-speech.ts, data/english/parts/opening-speech.json, src/core2/office-day-federal-calendar.ts

**Notes.** TODO
