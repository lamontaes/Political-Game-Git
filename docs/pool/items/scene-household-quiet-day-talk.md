---
id: scene-household-quiet-day-talk
title: "Talk at home on a day with nothing on record opens on the day itself, instead of closing at once with a goodbye"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/director-household-quiet-day
pr: #6312
blocked-on:
source: "words-and-scenes lead, Oct 27, probing the Oct 26 home talks (deliverable 7 of docs/work-orders/lead-words-scenes-2026-10-26.md)"
lead: director
milestone: play-first
claimed-at: 2026-10-27T12:16:26.251Z
---

**What.** In Fananganan, Northern Mariana Islands (seed `home-a:0`, February 9, 2025), Talk with either household member is a single line: "We can pick this up later." On a day when nothing new is on record, the conversation has no subject. So it closes at once. The owner heard talks that said nothing on Oct 26. A player who presses Talk expects the person to say something about the two of them or the day they had.

**Rules.** Serves LAW.md §4 and `scene-standard` (a scene writes something back; lines vary by trait and tie). No dice: the opener comes from what the records hold about the two of them (the last time they spent together, the day of the week, a job or school day just ended), never from a random small-talk pick. Ask why: each line cites the record it stands on.

**Done when.** In a drawn place (buildBenchWorld, seed printed), a talk with a household member on a day with no news opens with a subject kind `quiet` carrying facts from records (`weekday`, `lastTogether` with its contact record id, and `dayDone` when the speaker or the player worked or went to school that day, citing the work or school record). It offers four replies that are four stances, and writes the contact back. A test shows it on such a day and fails when the subject is removed.

**Time box.** 2 hours.

**You will see.** On a quiet evening at home: "Long day?" or "You were up early." with four replies, not an instant goodbye.

**Screenshot.** The talk box on a quiet evening, from a drawn place, in the PR body.

**Files.** src/director/conversation.ts, src/director/data/conversation-rules.json

**Notes.** The lines are drafted and ship on the words side, keyed to the facts above: "Long day?" [dayDone] / "You were up early." [dayDone] / "Haven't seen much of you since {lastTogether}." / "It's been a quiet {weekday}." The replies are tired, fine, wanting to talk, and wanting to be left alone.

The full drafted set (words lead, Oct 27) is on branch `words/home-talk-lines` at e356f24e71, in `data/english/parts/conversation.json`. The words lead ships it in the same change that passes the facts.
