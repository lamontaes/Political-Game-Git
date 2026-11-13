---
id: play-campaign-doors-knocked-at-midnight
title: "The campaign trail lets a candidate knock on doors from midnight to 3:00 AM on election day"
area: play
kind: bug
priority: 3
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
root: none
source: Playtester P1, Nov 13
claimed-at:
---

**What.** Commack, New York (bench seed 84f2626c-06e2-4b64-95cc-ab59382b866b) and Richburg, South Carolina (bench seed a8ad5c79-cb5b-4616-b711-61b16eca1a9d), main 5e68cde1. The Week before the election stops at Tuesday, November 4, 2025, 12:00 AM (the candidate's election-morning stop). Travel → The campaign trail → Knock on doors still offers "How long 3 hours / Go". Pressing Go knocks 40 doors and the clock reads 3:00 AM. The talk of a door scene that hour is the ordinary daytime one. Any act on the trail is offered at any hour, since offices keep their hours (`play-offices-keep-their-hours`) but the trail does not.
Seen: the campaign trail's tiles and Go button, and the clock after an act.

**Cause.** Found in code: src/core2/campaign-day.ts `campaignDayChoices` sets each act's `available` from the campaign's records only (households left to reach, an outlet with room, a host), with no reading of the clock. src/bench/campaign.ts passes `available` through, and src/bench/play.mjs offers Go whenever it is true.

**Fix.** Give each campaign act the hours it can happen in, a parameter row per act (doors in daylight and early evening, a phone bank in the evening, a forum or event in the evening), TUNABLE with its spread. Then `campaignDayChoices` marks an act out of hours as not available with a reason the trail already words ("Not today", or an "Opens at" line like the offices'). An act started near the end of its hours ends when they end.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One rule, all 56 places: the hours are parameters, read for every act. No hand-written player text: the out-of-hours reason is a control from data.

**Done when.** A second session, on main, plays a new life in a drawn place to a filing, presses Hour into the night and takes a screenshot of the campaign trail. Knocking on doors is not offered at night and says when it opens. The next morning it is offered, and its clock moves by the act's hours.

**Waits on.** Nothing.

**Files.** src/core2/campaign-day.ts, src/bench/campaign.ts, src/bench/play.mjs
