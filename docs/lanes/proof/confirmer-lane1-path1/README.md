# Confirmer replay: Lane 1, Path 1 (one race, one deadline)

Replayed Nov 4, 2026 on main c3a29bb02d by a session that built none of it. `npm run bench`, Chromium at 1440 by 900, as a player: New game, Start a life, Emily Carter, born April 10, 1985, Haleyville, Alabama picked in the creator, world seed the town's replay number ab5f58e9be125c95 (the town opened as Haleyville). The opening played through, then the Week button pressed once a week, every talk answered with its first reply. Each week the log records the races the game would let the player file for and the ballot the Campaigns screen reads (`haleyville-weeks.log.txt`, script `replay-filing.mjs`).

**Result: fail at the first step.**

- The Haleyville City Council has five seats, all at large; every holder and the mayor shows as elected July 21, 2024, with terms to September 2028 (`haleyville-4-government-in-window.jpg`). No council race appears on any screen from January 20, 2025 to February 10, 2026. Alabama held its town elections in August 2025.
- Nothing opens for filing for 43 weeks. On November 24, 2025 (week 44), five races open at once: U.S. Senator, U.S. Representative, Governor, State Senator and State Representative, all closing January 23, 2026, at one Travel entry named "State party chair; Secretary of State" (`haleyville-2-travel-in-window.jpg`).
- The Campaigns ballot for November 3, 2026 lists only the 13 county offices (circuit clerk, seven commissioners, coroner, district attorney, probate judge, sheriff, tax assessor) and none of the five races the player may file for (`haleyville-1-campaigns-in-window.jpg`).
- So the path's checks (one race offered, an at-large council as one pooled race, the clerk and the panel giving one date, a petition smaller than the town) can't be seen in Haleyville. No page errors, no failed requests.

Filed: `elections-town-council-on-state-municipal-cycle`. The pooled at-large race is `elections-at-large-race-pooled` (open). Johnson, Minnesota (the petition half) was not replayed this pass.
