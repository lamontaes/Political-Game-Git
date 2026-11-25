---
id: story-journal-evening-reads-tomorrow
title: "The Journal's first evening can look ahead to what's on the town's calendar tomorrow"
area: words
kind: wiring
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: "CTO, Nov 24 19:54Z (7142760180 on #10377): file each missing fact as an engine item for its owner; the Story lead's question, 7142124378 on #10377"
checked:
---

**What.** The Journal writer (W3) has run out of true facts for the first evening's `ahead` section: it can only lean on the player's traits, so the close reads the same in every life. The town's calendar has real next-day events (a meeting, a filing deadline, an election), but the Journal can't see them. Seen: the Journal's first page, at its close.

**Cause.** Found in code: the schedule is on record. Contests keep `filingOpens`, `filingDeadline` and `electionDate`; `nextMeetingDate` (src/core2/modules/office-day.ts:592) gives a body's next meeting; and `calendarItems` (src/bench/calendar.ts:77) already reads them for the calendar screen. The Journal never reads them. `eveningChapter` on story/first-evening (src/director/journal-evening.ts:101-214) carries who watched, the theme, the stance, a housemate's work, a relative's letter and the place, and nothing about the next day. No file in src/director imports from src/bench, so it can't call `calendarItems` as it stands.

**Fix.** Move the record reading in `calendarItems` (not its words) into src/director or src/core2 as one reader, and have both the calendar and journal-evening.ts read it, with no second calendar reader. In journal-evening.ts, carry `tomorrow` facts for the next day's rows (what it is, the body or office, by record id). W3 writes the `ahead` lines.

**Time box.** 2 hours.

**Rules.** Replace, never layer: the calendar reads the moved reader in the same change. One rule, all 56 places. No hand-written player text.

**Done when.** In a played world at a drawn place whose next day has a scheduled meeting, deadline or election, the first evening's packet carries a `tomorrow` fact naming it by record id, and the calendar screen shows the same rows as before. A second session sees the Journal's close name tomorrow's event once W3's lines are in.

**Waits on.** Nothing. The code is on story/first-evening until it merges.

**Files.** src/director/journal-evening.ts (new), src/bench/calendar.ts, src/core2/modules/office-day.ts
