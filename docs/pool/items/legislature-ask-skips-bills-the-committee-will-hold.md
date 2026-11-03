---
id: legislature-ask-skips-bills-the-committee-will-hold
title: "A sponsor asks for votes only on a bill that will reach a roll call, not one the committee holds the same day"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
lead: governing
source: governing lead, Nov 1 (skeptic on legislature-ask-before-the-roll-test-red-by-seed)
claimed-at:
---

**What.** askBeforeTheRoll (src/core2/modules/legislature.ts) skips a bill only when a committee has already held it, but a bill on the weekly floor runs its committee stage inside countVote on the floor day itself (legislature.ts:4228-4241; only scheduleVote puts a committee meeting on the calendar ahead of the floor, :5398). So the evening before, the sponsor asks members about bills the majority chair is about to hold, and the member's reply is a pull no roll call ever reads. In Smithville, Tennessee (4769320, run seed chk2-b draw 0) 361 asks in 240 days and in Lincoln Park, Georgia 369 never reached a roll call, and the player is asked about nearly every failing bill.

**Rules.** An effect is a read, not a record: an ask whose answer no roll call reads is an unregistered placeholder, so the sponsor asks only about a bill the chair will report, read the evening before from the chair's own hearing decision (chairPosition plus hearing trait in committeeStage), never a roll of chance. One engine: the same committee rule decides both the ask and the hearing, with no second copy of it.

**Done when.** In a drawn place with its seed printed, every vote-ahead ask written in a played year is for a bill that the next floor day's roll call votes on, by ask and roll call id; a bill the chair holds draws no ask; src/director/ask-before-the-roll.test.ts finds a played ask on its first draw in the two places named above; a break-it run with the old rule shows asks with no roll call.

**Files.** src/core2/modules/legislature.ts, src/core2/legislature.test.ts

**Notes.** Found by the skeptic on legislature-ask-before-the-roll-test-red-by-seed (Nov 1). Phase B: M3-02's asking a colleague is read only where the vote follows.

Nov 2, 01:40 (governing lead): branch governing/ask-skips-held-bills at 4256088d61. Done: committeesBeforeTheFloor in legislature.ts sends each bill on the next floor day to its first chamber's committee the evening before through holdCommittee; a later chamber is not asked (SG-GOV-later-chamber-same-day). src/core2/legislature-ask-reaches-roll.test.ts passes: arr-1 Organ, New Mexico 9 of 9 asks reach their roll call, arr-2 Castle Pines Village, Colorado 61 of 61; with main's legislature.ts arr-1 fails on Badger, Iowa. legislature.test (20), committee and ask callers and ask-before-the-roll on chk2-b (first draw) and abr-fresh-3 pass; a year runs 29.2 s against main's 28.1 s (North La Junta, Colorado). Left: src/director/one-sponsor-one-evening.test.ts (Words') finds no evening with two asks by one sponsor on seed fd20a2a4fc1f6997 at 150 or 240 days; Words was asked (01:40) how to cover that scene. Open the PR after their answer, Review: words.

Nov 2, 02:45 (Words' answer, recorded by the governing lead after handoff): go ahead with the third option. Cover the one-evening staging with a test that builds a sponsor's two evening asks to the player through the legislature's own ask records in a bench world: the engine writes the records, and no lines are inserted by hand. Keep the played test in src/director/one-sponsor-one-evening.test.ts for when a played year has the case, and name the rarity in its comment. Words is filing words-one-sponsor-one-evening-setup, so a later Words session rebuilds the played test's setup (a sponsor with two bills that pass committee) and makes it strict again. The PR (branch governing/ask-skips-held-bills, head 4256088d61) need not wait for that item; open it with Review: words once the staging test is in.
