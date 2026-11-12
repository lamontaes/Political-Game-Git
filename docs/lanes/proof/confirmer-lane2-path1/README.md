# Confirmer replay: Lane 2, Path 1 (first minutes)

Replayed Nov 4, 2026, 06:29 to 06:37 UTC, on main 783974f6 (includes #7143, #7147, #7157 and #7189), by a session that built none of it.

**How.** `npm run bench`, then in Chromium at 1440 by 900, as a player: New game, Start a life, the creator (Emily Carter, female, born July 16, 2006), the town's state and town picked from the creator's lists, the look, Begin. The world seed is the town's replay number from `docs/lanes/towns.md` (the creator's `/api/seed` answer is set to it). The opening talk is played through with `start-life.mjs`'s `playOpening` (Continue on each line, never Skip). Then the room, People (web and List, then View person on every relative) and Money. No day was advanced; every clock reads Monday, January 20, 2025, 8:30 PM. Scripts: `replay-first-minutes.mjs` (the New Game) and `cards.mjs` (Continue on the same life, the cards).

| Town                   | Replay             | Home on Money            | Room shown                | Siblings (your name: Emily) | Youngest parent at a birth          |
| ---------------------- | ------------------ | ------------------------ | ------------------------- | --------------------------- | ----------------------------------- |
| Haleyville, Alabama    | ab5f58e9be125c95   | Rented mobile home, $488 | trailer-home-living       | Melanie                     | 25 (mother, 2003)                   |
| Murray, Nebraska       | 1d3f0e18ca4ba7e5   | Owned house              | house-suburban-living     | none                        | 27 (mother, 2006)                   |
| Meadow Lakes, Alaska   | f835dd278d7312a1   | Owned house              | house-suburban-living     | River                       | 19 (grandmother Alex, 1954 to 1973) |
| Brookside, Delaware    | 4d50e1f88df997f9   | Rented apartment, $1,130 | apartment-suburban-garden | none                        | 27 (mother, 2006)                   |
| Storrs, Connecticut    | storrs-1           | Rented house, $1,770     | house-suburban-living     | none                        | 17 (mother, 2006)                   |
| Washington, D.C.       | dc-closures-a      | Owned rowhouse           | rowhouse                  | Anna                        | 16 (grandmother Lisa, 1979)         |
| Cabo Rojo, Puerto Rico | f857db7436bf7449   | Rented apartment, $352   | apartment-student-shared  | Lauren                      | 15 or 16 (you; son Elijah, age 2)   |
| Santa Rita, Guam       | 6f539fcfdf6d96f9-5 | Owned house              | house-suburban-living     | none                        | 18 (grandfather Ronnie, 1967)       |

Every town printed the place it was asked for. No page errors and no failed requests in any town. Per town: `<town>-2-room.jpg`, `-3-people.jpg`, `-4-money.jpg` (lossless captures converted to JPEG at quality 90 to keep the repository small) and `<town>.json` (the New Game URL, the card texts, the backdrop file).

**Seen, not part of this path:** in Cabo Rojo an 18-year-old renting an apartment with two sons aged 1 and 2 gets the student shared-apartment room (string lights, a laptop, a bicycle); the room matches the kind of home but reads like a student's, which is the owner's look to judge. In Haleyville the mother's card reads "Police Chief" with employer "CITY OF HALEYVILLE treasury" in capitals, while her history says she works at Wilkinson's Market.
