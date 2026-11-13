---
id: words-promise-of-time-fits-the-calendar
title: "A promise of time fits the calendar (Fable A's rule 22): 'I'll have a real count by Friday' on the morning of the vote"
area: words
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: Words builder W3
pr:
after:
blocked-on:
lead: words
model: opus
effort: medium
root: rc2-done-from-records
source: "Fable A's rule 22, Nov 13, 2026 06:05Z on #8928, from Playtester P3"
checked:
claimed-at: 2026-11-13
---

**What.** On Aug 5 at 8:00 AM, Logan Tyson asks the player to carry Ordinance 2025-8 and says "I'll have a real count by Friday." The board votes on it at 6:00 PM that same day. A day named in a promise must come before the thing it is for, from the record (P3, batch 3). Seen: the carry-bill scene's answer to "Where are we now?"

**Cause.** Found in code: data/english/parts/scene-talk.json's carry-bill answer "Short. I'll have a real count by Friday." names a fixed weekday, and src/director/purpose-scene.ts gives the scene no fact for when the bill comes to a vote, though the legislature keeps it (`floorDateOf`).

**Fix.**

- purpose-scene.ts reads the bill's floor date and says either `vote-tonight` (the vote is on the scene's day) or `count-by` (the day before the vote, as `dayAhead` in src/english/day-words.ts says it: the weekday within the week, else the date; never today or a day gone).
- The fixed-day line is replaced by "Short. I'll have a real count by {count-by}.", "Short. We'll know tonight when {bill} comes up." and "Short. I'm still counting heads on {bill}." for a bill with no vote on record.

**Time box.** 2 hours for one session.

**Rules.** No hand-written player text: the day comes from the bill's record through the bank, and a line names no day the record does not hold.

**Done when.** A second session plays a drawn place on main, named with its seed, until a member is asked to carry a bill, and asks "Where are we now?". On the day of the vote the answer says tonight. Before it, it names a day before the vote, and never a fixed weekday.

**Waits on.** Nothing.

**Files.** src/director/purpose-scene.ts, src/english/day-words.ts, data/english/parts/scene-talk.json, src/director/carry-bill-scene.test.ts
