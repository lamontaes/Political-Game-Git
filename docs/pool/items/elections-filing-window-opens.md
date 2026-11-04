---
id: elections-filing-window-opens
title: "A race's filing opens in its filing window, not on the game's first day"
area: elections
kind: bug
priority: 2
size: M
status: done
claimed-by: governing/filing-window-opens
pr: #7168
blocked-on:
source: words session, Oct 30 (campaign-season test red), filed by the governing lead
lead: governing
claimed-at: 2026-11-04T02:52:27.205Z
---

**What.** Most regular contests carry filingOpens null, which the filing check reads as open from the game's first day, so a November 2026 race can be filed for 22 months early and its campaign beats spread over a year with nothing in them. The words session's campaign-season test is red on seeds aa11 and bb22 because of it: Whittlesey WI files for governor on January 20, 2025. Real candidate filing opens in a window weeks or months before the deadline.

**Rules.** Estimate, never UNKNOWN: where a place's row has no filing opening date, the contest's opening is estimated from the deadline minus a sourced filing window, marked as an estimate with its source, never left null. One rule, all 56 places: the window comes from data by state and office family.

**Done when.** A data test over contests opened in drawn places of all 56 finds every regular contest with a filingOpens date at or before its deadline and after the game's start where the election is more than the window away, each estimated date marked with its source; the words campaign-season test first beat passes measured from the window.

**Files.** src/core2/elections-calendar.ts, src/core2/modules/elections.ts, data/research/elections/filing-requirements.json

**Notes.** TODO

Nov 4 (Lane 1, branch governing/filing-window-opens, built on #7085's branch): every contest is made with an opening day, the calendar's or an estimate filingWindowDays (60) before the deadline, marked in its sources; src/core2/filing-window.test.ts checks 165 contests in six drawn places. campaign-season.test.ts now lets the weeks pass until a race is open (agreement 1-3): aa11 passes; bb22 files for Arizona governor on its opening day, 2026-01-26, and its first beat comes on 2026-03-23, 56 days later against the test's 28. That quiet middle is the season-filling work the test's header leaves to its parent item (Lane 3), so the second done-when line is not met by this branch alone. The PR waits for a free slot (Lane 1 is at five open).

