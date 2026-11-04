# Confirmer replay: Lane 1, Path 3 (a yes becomes a vote)

Replayed Nov 4, 2026 on main 2e321723d8 by a session that built none of it. New Game in Murray, Nebraska (picked in the creator; replay 1d3f0e18ca4ba7e5; it opened as Murray), Emily Carter, born April 10, 1985. Chromium at 1440 by 900, the Week button once a week, every talk answered with its first reply (`murray-run.log.txt`, script `replay-doors.mjs`).

- Filing opened June 2, 2026 (Council member and Mayor, closing August 1, election November 3, at the county clerk). Filed for Council member; on the ballot.
- **Door count on Campaigns:** Knock on doors pressed once a week from filing to election day. Campaigns reads 54 doors after the first evening, 377 by June 30, 1,012, 1,680, 2,790, 3,574 and 4,105 by election day (`murray-006-campaigns-doors.jpg`, `-044-campaigns-w76.jpg`, `-131-campaigns-w92.jpg`).
- She won, 110 to 37, 34 and 4.
- **The race's record of promisers' turnout:** not on any screen, results record or run log. `/api/results` holds only the player's own ballot reasons; path-check prints the count of door yeses but not whether they voted.

**Result: fail at "the race's record showing people who promised voted more than neighbors"**, which can't be seen. The door count half passes. Filed: `elections-door-pledge-turnout-shown`. Also seen on Campaigns: "2 endorsements" runs into "Where the race stands" with no space.
