---
id: press-first-week-interview-sittings-never-printed
title: "The interviews the player sat for in their first week of invitations never reach the news, while later ones print the same day"
area: gov
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: fable
effort: medium
source: "Account lead interview check, Nov 14, 2026 (train 04a2c7e4)"
root: none
claimed-at:
---

**What.** At Cannonville, Utah, the player sat for four interviews and answered every question. The two they sat for on Tuesday, Sept 30, 2025 (Amanda Conway) and Wednesday, Oct 1, 2025 (William Smith of KJRN-TV) never show in News. On Oct 7, KJRN-TV's page reads "Nothing here yet," and no station has a "Pat Candidate on ..." story. In the same week, the other candidates' interviews ran on Sept 29 ("Laura Larson sat down with us to talk about welfare and Medicaid"). The two sittings after that printed the same day: Oct 7 ("Pat Candidate on health and hospitals", KJMG-TV) and Oct 14 ("Pat Candidate on moving highway money to public transit", KOKP-TV). The player's news list (`/api/news?id=`) has printed stories with the player's interview ids dated 2025-10-06 and 2025-10-13 only, and none dated 2025-09-29. Seen at Cannonville, Utah (4910330), place seed 3a5884384393f00611b28a5ce609187c999d9b0f21d97ef4a4e9e0a15f724a08 (pin-b:0, debate draw). The player was a grown resident born 1978, filed for town council by the bench's own filing call, and pressed Week until the first call, then "Sure. Set it up." and one reply per question. Screens and logs: /mnt/project-files/seen/interviews/cannonville-ut-04a2c7e4/ (project files). Seen: the outlet pages under News, which show no story of the first interviews.

**Cause.** Needs cause. The two that did not print were the player's first sittings. Their interview rows come from the week of Sept 29, the same weekly pass that printed the other candidates' answers that day. Look at `answerInterview` and the publish step in src/core2/modules/press.ts (`printItem` runs only when `said && reporterId`), and at whether the player's row for that week still has `reporterId` and a non-null first stand when the sitting finishes.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Fable session at medium effort to find the cause, then 2 hours for a Sonnet session to fix it.

**Rules.** No dice. One rule, all 56 places.

**Done when.** A second session, at a drawn place and seed nobody chose, sits for the first interview the player is offered and finds "<name> on <issue>" on that outlet's page in News within a day.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts, src/director/sitting.ts
