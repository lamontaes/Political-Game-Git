---
id: gov-public-posts-paid-for-template-hours
title: "A public post is paid for the template job's 48-hour week while its stated pay and the budget assume 40, so press staff and other posts cost 20 percent more than planned"
area: gov
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `startPublicJob` (`src/core2/public-payroll.ts`) gives a public post the schedule of the longest-hours job where the employer sits, but states the post's pay as the caller's hourly times that template's `hoursDaily`. In Pony, Montana (seed `pcA1`, `buildBenchWorld("pcA1", start, {twoLevel: true})`) the template's commitment is six slots of eight hours, 48 hours a week, while its `hoursDaily` is 5.71 (40 hours a week). The work engine pays attended scheduled minutes, so the newspaper's head ($36.07 an hour) and reporter ($27.64) are paid $329,202 to $339,294 a week for the two, against $254,840 at 40 hours: 20 to 33 percent over. The outlet's book assumed 2,080 paid hours a year (payroll $132,517), so it paid out more than it took in and closed on 2025-06-30. Every post made by `startPublicJob` (press staff, town staff, aides) has the same 48-hour schedule copied from whichever job is the template, and the budgets plan each post at `fullTimeHoursPerYear` (2,080). In the same world, jobs counted by slot hours against stated hours: 5 press and 1 other public job at 48 versus 40, and 7 private jobs at 43 to 48 versus 40. Make a post's pay agree with the hours it is scheduled for: either the template is chosen or trimmed to the post's stated hours, or the hourly is scaled so a year's pay is the caller's hourly times 2,080.

**Rules.** Every dollar balances: what a post is paid in a year is what its line and its book plan. An effect is a read, not a record: the hours that pay are the hours the budget and the outlet's book read. No dice. One rule, all 56 places.

**Done when.** In a one-year run of the played world in Pony, Montana (seed `pcA1`) and two drawn places and seeds the builder did not choose, the weekly pay of every public post equals its hourly times 40 hours within 1 percent, shown by post and commitment ids, and `world-press-outlet-revenue-wage-gap` no longer lists a station closing for lack of cash in that place.

**Files.** src/core2/public-payroll.ts, src/core2/press-staff.ts

**Notes.** Found tracing why the Pony newspaper closed after it was given a cash buffer (`world-press-outlets-close-first-weeks`).
