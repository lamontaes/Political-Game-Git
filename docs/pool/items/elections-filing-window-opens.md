---
id: elections-filing-window-opens
title: "A race's filing opens in its filing window, not on the game's first day"
area: elections
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Most regular contests carry filingOpens null, which the filing check reads as open from the game's first day, so a November 2026 race can be filed for 22 months early and its campaign beats spread over a year with nothing in them. The words session's campaign-season test is red on seeds aa11 and bb22 because of it: Whittlesey WI files for governor on January 20, 2025. Real candidate filing opens in a window weeks or months before the deadline.

**Rules.** Estimate, never UNKNOWN: where a place's row has no filing opening date, the contest's opening is estimated from the deadline minus a sourced filing window, marked as an estimate with its source, never left null. One rule, all 56 places: the window comes from data by state and office family.

**Done when.** A data test over contests opened in drawn places of all 56 finds every regular contest with a filingOpens date at or before its deadline and after the game's start where the election is more than the window away, each estimated date marked with its source; the words campaign-season test first beat passes measured from the window.

**Files.** src/core2/elections-calendar.ts, src/core2/modules/elections.ts, data/research/elections/filing-requirements.json

**Notes.** TODO
