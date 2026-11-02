---
id: legislature-ask-skips-bills-the-committee-will-hold
title: "A sponsor asks for votes only on a bill that will reach a roll call, not one the committee holds the same day"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: governing/ask-skips-held-bills
pr:
blocked-on:
lead: governing
source: governing lead, Nov 1 (skeptic on legislature-ask-before-the-roll-test-red-by-seed)
claimed-at: 2026-11-02T00:21:39.987Z
---

**What.** askBeforeTheRoll (src/core2/modules/legislature.ts) skips a bill only when a committee has already held it, but a bill on the weekly floor runs its committee stage inside countVote on the floor day itself (legislature.ts:4228-4241; only scheduleVote puts a committee meeting on the calendar ahead of the floor, :5398). So the evening before, the sponsor asks members about bills the majority chair is about to hold, and the member's reply is a pull no roll call ever reads. In Smithville, Tennessee (4769320, run seed chk2-b draw 0) 361 asks in 240 days and in Lincoln Park, Georgia 369 never reached a roll call, and the player is asked about nearly every failing bill.

**Rules.** An effect is a read, not a record: an ask whose answer no roll call reads is an unregistered placeholder, so the sponsor asks only about a bill the chair will report, read the evening before from the chair's own hearing decision (chairPosition plus hearing trait in committeeStage), never a roll of chance. One engine: the same committee rule decides both the ask and the hearing, with no second copy of it.

**Done when.** In a drawn place with its seed printed, every vote-ahead ask written in a played year is for a bill that the next floor day's roll call votes on, by ask and roll call id; a bill the chair holds draws no ask; src/director/ask-before-the-roll.test.ts finds a played ask on its first draw in the two places named above; a break-it run with the old rule shows asks with no roll call.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature.test.ts

**Notes.** Found by the skeptic on legislature-ask-before-the-roll-test-red-by-seed (Nov 1). Phase B: M3-02's asking a colleague is read only where the vote follows.
