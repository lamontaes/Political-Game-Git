---
id: press-first-week-interview-sittings-never-printed
title: "An interview the player sat for never reaches them when they do not follow the outlet that printed it"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-sew1gc
pr: "#9267"
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

**Cause.** Measured: at Cannonville, Utah (4910330), seed 3a5884384393f00611b28a5ce609187c999d9b0f21d97ef4a4e9e0a15f724a08, all four interviews were printed. Replaying the same world in a script shows each row `published` with a story (Sept 30 on television:0, Oct 1 on television:1, Oct 7 on television:3, Oct 14 on television:2). Found in code: `printItem` (src/core2/press-desk.ts) sends a story only to `ctx.followers(outlet.id)`. The player follows television:2 and television:3 but not 0 and 1, so the first two never reached them. A story only shows in News once the reader has heard it (`heardItems`, src/bench/calendar.ts). A second fault sits underneath: `scheduleDeliveries` (src/core2/modules/news.ts) queues a delivery dated today when a story is printed during the player's turn, but today's deliveries were already read in `onAfterDay`. So the story's own subject (the `atOnce` reader that past-news.ts already uses) would never hear it either.

**Fix.** In `printItem`, the one person a story is about joins its readers and hears it the day it runs, through `printStory`'s existing `atOnce` argument, as the news of the years before the start does. The story's follower count and counted reach still count followers only. In `scheduleDeliveries`, an `atOnce` reader hears the story now instead of being queued for a day already read. Test: src/director/interview-printed.test.ts, pinned at Cannonville, Utah. It fails without the fix ("expected undefined to be '2025-09-30'") and passes with it.

**Time box.** 3 hours.

**Rules.** No dice. One rule, all 56 places.

**Done when.** A second session, at a drawn place and seed nobody chose, sits for the first interview the player is offered and finds "<name> on <issue>" on that outlet's page in News within a day.

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/modules/news.ts, src/director/interview-printed.test.ts (new)
