---
id: play-someone-is-at-home-and-at-work-at-the-same-hour
title: "A parent stands at their workplace and in the kitchen at the same hour"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
source: lead's play of main plus the 10:00 UTC riders, Nov 11, 2026 (Polkville, Mississippi, seed dc46979e-5cd3-4ef4-aa57-4500488ec8ed)
checked:
claimed-at:
---

**What.** Played in Polkville, Mississippi (seed dc46979e-5cd3-4ef4-aa57-4500488ec8ed), on Tuesday, January 21, 2025. The player went to Young Manufacturing at 8:17 AM and talked to their father, Michael McFarland, on his shift there. At 8:42 AM the player was at home, and the strip named Michael McFarland, Laura McFarland and Blair McFarland in the kitchen. Laura was also named at the Polkville Public Works Department at 9:50 AM, on her shift. A person is drawn wherever the player happens to be: at work when the player visits the workplace, and at home whenever the player is home. Seen: the strip of people at home on any working day.

**Cause.** Found in code: `presentIds` in src/bench/scene.ts (line 607, "At home the household is there") returns every living member of the household whenever the room is one of the home's rooms, and never reads the hour. A workplace visit reads the hour: `visitPlace` in src/bench/places.ts (line 261) keeps only the staff `onShift` (line 219) says are working at that minute. The two readers disagree, so someone on a shift is in both rooms.

**Fix.** One reader says where a person is at a minute, and both rooms use it. Move `onShift` out of src/bench/places.ts to where src/bench/scene.ts can call it (or export it), and in `presentIds` leave out a household member whose job's hours cover the minute the scene is drawn at. `presentIds` takes the minute as an argument from `benchScene`, which already holds it. The opening evening keeps the whole household (the address is watched at home, owner, Oct 14). A member with no job, or off shift, is at home as now. School hours are not read here: no reader gives a student's school day yet, so say that in the pull request and leave students at home.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One engine per mechanic: one reader says who is on a shift, and a second rule in the home scene is a duplicate (AGENTS.md, owner, Oct 27). A view that computes its own version of a fact is a duplicate (owner, Oct 28). One rule, all 56 places: the test draws its place and names it with its seed. No dice: who is at home follows the job's own hours, never a chance.

**Done when.** A second session starts the bench (`npm run bench`), starts a new life in a drawn place (place and seed written down), presses Day, and on a weekday morning takes a screenshot at 1440x900 of home and of the workplace of a household member who has a job. That member is on the strip at the workplace and not on the strip at home at the same hour; a member with no job is at home. A test in src/bench draws a place, finds a household member on a shift, and checks the home scene at that minute leaves them out and the workplace visit includes them.

**Waits on.** Nothing.

**Files.** src/bench/scene.ts, src/bench/places.ts, src/bench/home-and-work-agree.test.ts (new)

**Notes.** Found by the lead, Nov 11, 09:40 UTC, while fixing the visit that did not last (a talk at a place put the player back at home). Until that fix the kitchen was shown over the workplace's clock, which is how the same parent was seen in both. Related: words-home-day-talk-reads-the-hour-and-whose-day-it-was (the talk that same parent then has).

Seen again by Playtester P2 (Easton, Maryland, seed 93784901-9f10-4cdc-9ccd-9d038396f6ca, main 596d5127). On Tuesday, January 21, 2025, Travel's card read "Easton Public Schools / OPEN / Closed now" with no Who's there. On arrival at 11:35 AM, Melissa Keller, Linda Cortez, Neil Paul, Taylor Hudson and James Morales were in the room. Mann Academy was the same at 1:16 PM. "Closed now" isn't the place's hours: `src/bench/play.mjs` (line 4536) shows it whenever `presentCount` is zero, and the room's cast on arrival is drawn by another reader. The fix's one reader serves this line too.
