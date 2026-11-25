---
id: campaigns-volunteers-without-a-join-record
title: "Trace how three people sat in the player's volunteers with no join or offer record"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
after:
blocked-on:
lead: governing
model: opus
effort: medium
source: "CTO, Nov 24 18:49Z (7141204837 on #10377): the volunteer question is real, file it for Campaigns as a trace item; Board mock's petition-short trace, 7140904607"
root: none
---

**What.** Before #10388, at Sherrodsville, Ohio (3972242), seed scan-1, the player's campaign listed three volunteers in `volunteerIds`: person_425792a8e48e84f6, person_98ffe867dc070ead and person_0acbbe7b42a7c833. None of them has a `campaign-volunteer-joined` or a `volunteer-offered` record under the player's filing. None of them knew the player at filing, and all three volunteer for rivals in the same council race. They filled the player's petition to 10 of 10. If a campaign's volunteers can leak into another campaign, a petition is filled by people who never joined it. Seen: the player's campaign screen and the petition count, where help shows up that nobody gave.

**Cause.** Needs cause. Board mock looked within a two-hour box and found no route that puts a person into `volunteerIds` without `VOLUNTEER_JOINED_EVENT` (src/core2/modules/campaigns.ts, around line 2240) or `VOLUNTEER_OFFERED_EVENT` (around line 2448). After #10388 the same world has no volunteers, so the old pin may have rested on the leak.

**Fix.** None until the cause is found.

**Time box.** 2 hours.

**Rules.** Find the cause by record. Never pin a test to Sherrodsville: a check finds the case by drawing places and waiting (drawn-place-tests). No dice decides who volunteers; their ties and the campaign do.

**Done when.** The writer of every id in a campaign's `volunteerIds` is named by a record (a join or an offer under that filing) in a played year at a drawn place. If a leak is found and fixed, a second session plays a drawn place on main, opens the player's campaign, and sees only volunteers who joined it, naming the place and seed.

**Waits on.** Nothing.

**Files.** src/core2/modules/campaigns.ts, src/director/petition-short.test.ts
