---
id: press-city-council-candidates-never-invited
title: "A filed council candidate in a big city gets no interview invitation from any of the city's outlets"
area: elections
kind: bug
priority: 3
size: S
status: merged
standard: 2
claimed-by:
pr: #10357
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: "Interview check thread, Nov 15, 2026, measuring invitations before election day for the outlet-of-record change"
merged-at: 2026-11-24T06:45:22.623Z
---

**What.** At Omaha, Nebraska (3137000), seed `omaha01`, the player (the first resident aged 35 to 59 by id) files for the city council race of Nov 3, 2026 (9 on the ballot) and plays to election day: no outlet of the city's 11 asks for an interview. The same count is 0 on the train base (cebf23ed) and with the outlet-of-record change, so that change did not cause it. Villages and suburbs measured the same way all get at least one invitation. A city paper commonly profiles every council candidate in a voters' guide. Seen: no reporter calls the player during the campaign.

**Cause.** Needs cause. Measured so far: 0 rows of `askedBy: "outlet"` in `interviewsFor` for the race, both rules. Read first: the seeking loop in `pressWeek` (src/core2/modules/press.ts), `newsworthiness` for an unknown candidate at a city's size against `newsworthyBar` and `televisionBar`, and whether a 9-candidate race's worth is split so no candidate reaches the bar.

**Fix.** None until the cause is found.

**Time box.** 2 hours for the cause.

**Rules.** No dice: an outlet's ask follows the candidate's worth to its audience, never a roll or a quota.

**Done when.** The cause is written here with the code line that decides it, and either a fix item or a ruling that a city outlet does not ask an unknown council candidate. If fixed, a second session plays a council race in a drawn place of over 100,000 people on main, names its seed, and sees an outlet's invitation reach the player in the running game.

**Waits on.** Nothing.

**Files.** src/core2/modules/press.ts

**Notes.** Measurement script and both rules' rows: interview check thread, Nov 15.
