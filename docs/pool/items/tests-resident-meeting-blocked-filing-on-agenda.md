---
id: tests-resident-meeting-blocked-filing-on-agenda
title: "The resident-at-a-meeting test fails when a blocked filing sits on the meeting's agenda"
area: office
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: "Account lead T35, Nov 14, 2026 (seen while running src/core2/office-day-attend.test.ts on PR 9063)"
checked:
claimed-at:
---

**What.** "a resident marks a posted meeting, is held at its hour, speaks, leaves, and the members meet them" in src/core2/office-day-attend.test.ts fails by draw. It fails at Sharon, Oklahoma (4066650), seed 256767e7bfa0a33aaf014d32cd35bf4db8fa37fd75f55eb49ae9f400f62603e0, with: "bill:office:gus2025:194947:board:2025-02-03:person_17be1e24e56aa1bd:11: expected 'blocked' to be 'failed'". A resident who marks that meeting sees the blocked ordinance on the meeting's panel beside the items still waiting for a vote, which the test does not expect. Seen: the meeting panel a resident is held at, and the test run.

**Cause.** Measured: Sharon, Oklahoma (4066650), seed 256767e7bfa0a33aaf014d32cd35bf4db8fa37fd75f55eb49ae9f400f62603e0, played as the resident to Feb 10, 2025: on the train (claude/project-thread-lhbwzt at 49e8f924) and on PR 9063 alike, the county board's members file ordinance 2025-11 on Feb 3, 2025. It asks for multifamily housing in single-family zones, which the state does not let the county decide, so it is drafted "blocked" (`draftBill` in src/core2/modules/legislature.ts). `placeFiled` in src/core2/modules/office-day.ts puts it on the Feb 4 agenda with the other filings. The test assumes every non-drafted item on the agenda was failed by a committee on the eve.

**Fix.** Decide whether a blocked filing belongs on a meeting's agenda. If it does, the panel shows it through `billEnding` ("blocked", with its reasons), and the test accepts "blocked" with its authority reason. If it does not, `placeFiled` leaves blocked filings off the agenda. Read the meeting panel first to see which one the screens expect.

**Time box.** 1 hour for one Sonnet session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never loosen a test to pass a failing case without the lead's word. One rule, all 56 places: what a county may decide comes from data.

**Done when.** The test passes at Sharon, Oklahoma with the seed above and on a fresh drawn place. A second session, playing a resident in a drawn place on main, marks a meeting whose agenda holds a blocked filing and sees the meeting panel show it the way the fix decides, with the blocked reason in words.

**Waits on.** Nothing.

**Files.** src/core2/office-day-attend.test.ts, src/core2/modules/office-day.ts

**Notes.**
