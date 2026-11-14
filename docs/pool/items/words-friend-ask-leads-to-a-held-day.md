---
id: words-friend-ask-leads-to-a-held-day
title: "A friend's ask holds the day it asks for, so a yes can be kept or broken"
area: words
kind: bug
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Words lead ruling on the family life lines, Nov 14 2026: /mnt/project-files/words-lead/family-life/rulings-1.md"
model: sonnet
effort: medium
root: none
---

**What.** A friend asking the player for something (purpose `friend-ask`, scene `becoming-friends`) ends on a yes that keeps a `promise`, but the day asked for is never held by any engine, so the promise can never be kept or broken. Eleven requests that asked for such a day (a dinner, a lunch, drinks after work, a ride for a child) were cut from the bank on Nov 14; the one left asks the player to come to the next meeting of their party, which the parties engine holds on its calendar. Seen: the friend's ask in a played year, and whether the promised day comes.

**Cause.** Found in code: the `friend-ask` arc in src/director/purpose-arcs.json keeps `promise` on a yes, and nothing writes a calendar day for it; the parties engine's `party-meeting` calendar work (src/core2/modules/parties.ts ~572) is the only held day any remaining request names.

**Fix.** Have the yes to a friend's ask put the player down for a day an engine already holds (the next party meeting, a town meeting, a gathering the partnerships engine schedules) and record the promise against that day, so the promises engine can read whether the player came. Lines for each kind of held day go to the Words lead first. No new calendar of social plans.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: whether the player goes is their own act, never a roll. One rule for every place.

**Done when.** A second session, in the running game on a drawn place, says yes to a friend's ask and sees the day come; and in three drawn places, a friend's ask that the player says yes to names a day on an engine's calendar, and the day it comes the promise is recorded as kept or broken, by record id.

**Waits on.** Nothing.

**Files.** src/director/data/purpose-arcs.json, data/english/parts/scene-talk.json (Words lead), src/core2/modules/parties.ts (read only)

**Notes.** Filed by the family life builder (thread "Write family life scenes"), Nov 14 2026.
