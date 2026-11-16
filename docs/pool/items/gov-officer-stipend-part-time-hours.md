---
id: gov-officer-stipend-part-time-hours
title: "A stipend post works part-time hours at a real hourly rate, so no officer reads as paid cents an hour and none opens a short-pay case"
area: gov
kind: bug
priority: 2
size: M
status: merged
claimed-by: account-lead-f1
pr: 9414
blocked-on:
standard: 2
model: sonnet
effort: medium
lead: governing
root: none
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
claimed-at:
branch: claude/f1-stipend-posts
---

**What.** startPublicJob (src/core2/public-payroll.ts) fit a post to its budget line by cutting the hourly rate and keeping the full 8.5-hour public-office week. At Woolstock, Iowa (seed a6bc7bc6b5a348493264a233f7dcf3e34b4864dcc1b094808f825c4db4300664) the City Attorney's commitment read 94 cents an hour against a floor of 725, the City Clerk's 93, the Public Works Superintendent's 406. The minimum wage no longer skips these posts in the case look, so each holder was offered a short-pay case they could not be owed. The pay in total was right; the rate and the hours were not. Seen: at Woolstock, Iowa, in the case look for a town officer.

**Cause.** Found in code: src/core2/public-payroll.ts, the block that computed `hourlyMinor` from `lineHourlyMinor` (the rate the line's daily room pays over a full-time day) and wrote it onto a commitment that kept the template's full-week slots; `problemOf` (src/core2/modules/constituent-cases.ts) flags any current commitment whose `hourlyMinor` is under the minimum wage in force, so a stipend post read as shorted. `lineHourlyMinor` is also the figure staff.ts compares applicants by, so it keeps its meaning; only the commitment changes.

**Fix.** A post whose line carries less than a full-time week keeps the post's going hourly rate (raised to the public pay floor where the law sets one) and works the part-time week the line pays for: the full-time week's minutes scaled by line rate over going rate, spread over the fewest days of the template's week. Pay in total is unchanged (minutes times rate equals the line's daily room times the days). The cut-rate path and SG-GOV-officer-stipend-hours (row and marker) are deleted. No skip is added to the case look: a truly shorted worker still opens a case.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN. One rule, all 56 places. No dice: a share and a schedule, never a roll. Replace, never layer: the cut-rate path is deleted in the same change. One mechanism for public pay: states and the country use the same startPublicJob.

**Done when.** A second session, in buildBenchWorld at Woolstock, Iowa (draw case-help-pinned-1:help:37) and at a drawn place nobody chose, finds no public post's commitment under the minimum wage, every part-time post's scheduled minutes times its rate equal to its line's daily pay, no short-pay case for any public post holder, and a worker in an ordinary job paid under the floor still opening one; src/core2/stipend-post-pay.test.ts, src/core2/wage-floor-exempt.test.ts and the staff and executive tests pass; SG-GOV-officer-stipend-hours is gone.

**Waits on.** Nothing.

**Files.** src/core2/public-payroll.ts, src/core2/data/stopgaps/gov.json, src/core2/stipend-post-pay.test.ts

**Notes.** Revived from dropped (Nov 10) by Account lead F1, Nov 15, 2026, at the coordinator's word after Woolstock's 94-cent commitment. The other thread's `jobs-short-pay-case-pay-is-94-cents-an-hour-at-woolstock` (#9328) names the same case from the case side.
