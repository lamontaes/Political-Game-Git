---
id: words-a-date-in-another-year-is-said-with-its-year
title: 'A date in another year is said with its year or as "last February"'
area: director
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by: opus-lr
pr: #9033
after:
blocked-on:
lead: words
model: opus
effort: medium
root: design-life-record
source: Fable A, rule 3, Nov 13, 2026, from Playtester P2's lines (Hewitt, New Jersey); filed by the Life records builder opus-lr
checked: opus-lr 2026-11-13
merged-at: 2026-11-13T08:34:42.436Z
---

**What.** Fable A, Nov 13, rule 3: "A date in another year is said with its year or as \"last February\". A bare month and day always means this year." Playtester P2, Hewitt, New Jersey (seed bf6b1bd7-4b1b-4fd7-92f9-6c5ec310f7b0), January 31, 2026: "First thing on January 31st, Aaron Hamilton stops you in the street about what happened on February 20th." The recall petition was from February 20 of the year before. Seen: a scene's opening line that says when its record happened.

**Cause.** Found in code: `daySince` in `src/english/day-words.ts` tells a record more than six days old as "on {date}", and `dateSaid` never says a year, so a day in another year read as this year's.

**Fix.** `daySince` tells a day in another year as "last {month}" for the year before and "in {month} {year}" before that, from `sinceOtherYear` in `data/english/day-words.json`; this year's dates and the recent rows ("yesterday", "the other day") are unchanged.

**Time box.** 2 hours, Opus.

**Rules.** No hand-written player text in code: the words are in the day-words data.

**Done when.** In three places, each a drawn place, a test plays past the new year and composes every scene about a record from the year before: none says its day as a bare month and day. A second session, on main, plays a life past the new year and sees a scene about last year's record say "last" and the month, or the year.

**Waits on.** Nothing.

**Files.** src/english/day-words.ts, data/english/day-words.json, src/english/day-words.test.ts, src/director/scene-date-in-another-year.test.ts

**Notes.** Built by the Life records builder (opus-lr), Nov 13.
