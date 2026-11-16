---
id: card-visit-offered-to-housemates-and-at-night
title: "A person's card offers Visit to someone who lives with you, and a visit at night runs the clock into the morning"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: family life thread
pr: 9256
after:
blocked-on:
lead: play
source: "Words builder A, Nov 15, 2026, played at 375014ae (#9334)"
model: sonnet
effort: medium
root: none
---

**What.** On the first evening (Anthon, Iowa, seed eae652bc-5253-4cee-9f54-425121a3ea01, 9:30 PM) the card of Sofia Bailey (12), who lives in the player's home, offers Visit with no reason. Pressing it moves the clock to 9:12 AM the next day and opens a talk with no title and no replies ("It's late on January 20. The day is done."). Seen: a person who lives with you is never offered Visit while they are home, and no visit is offered that would end after the day is over.

**Cause.** Found in code: src/bench/person-acts.ts `personActs` closes Visit as "here" only when the person is in the player's room now (`context.here`); someone at home but in another room falls through to `whereIs` (home) and is open. `visitPerson` in src/bench/handler.ts spends the trip and visit hours with no check against the end of the day.

**Fix.** Treat a household member who is at home as "here" for Visit (the card words it as it does now), and close a Visit whose trip and hours would run past the end of the day with a worded reason from controls.json person.actReasons ("It's too late to go over now."), read from the clock and the day's end, not a new number. A call to someone in the room is also not offered. Add the reason line to the Words lead for review.

**Time box.** 3 hours for one Sonnet session.

**Rules.** No hand-written player text in code. No dice. The reason comes from the record (the person's home, the clock).

**Done when.** A second session, in a drawn place with its seed named, plays the first evening on main, opens a housemate's card and a relative's card, and sees no Visit for the housemate at home and a worded reason at night.

**Waits on.** player-visits-or-calls-from-the-card (#9334, #9256).

**Files.** src/bench/person-acts.ts, src/bench/handler.ts, src/bench/data/controls.json
