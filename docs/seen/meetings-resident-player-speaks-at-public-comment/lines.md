# A resident at a council or board meeting: the lines as played

Pool item `meetings-resident-player-speaks-at-public-comment`, pull request #9022.

**The instruction.** CTO for the owner, Nov 13, 2026, 03:06Z, on issue #8928 (comment 6842583897): "Account lead, start it now. A resident who can't go to a council meeting and speak is a hole in the player's first months, so it goes ahead of the stand-ins. Use a Fable thread at medium effort for the scene design, and reuse the existing sign-up and meeting panel. Every line the player reads goes through Fable A, as with the director rows: list what the scene needs, Fable A supplies it through the composer and reads the PR as played before a merger takes it."

**Who wrote the words.** Fable A named the controls and asked for the lines on #8928; Words builder W3 wrote them into `data/english/parts/calendar.json` and `data/english/parts/meeting.json`. This pull request wrote none of them.

**How they were played.** `src/bench/meeting-resident.browser.mjs` against a fresh bench at 1440 by 900: a new life, played until the Calendar offers a posted meeting, marked there, stopped at its hour, spoke for the first item, left, and opened People the next morning. The before pictures are the same seed on main (`origin/main` as merged into this branch), played the same thirteen days, on the same date's plate.

## The three places

| Place                          | Seed                                   | Body                                           | Meeting          |
| ------------------------------ | -------------------------------------- | ---------------------------------------------- | ---------------- |
| Hanna, Wyoming                 | `12278b1f-2ecd-4977-9d13-ab4e5cd22965` | Carbon County Board of Commissioners           | February 4, 2025 |
| Pawleys Island, South Carolina | `c9591f98-a33d-4346-9a96-791d3c799c48` | Georgetown County Board of Commissioners       | February 4, 2025 |
| Priest River, Idaho            | `e8ebb471-efa3-44ae-b009-6ed996081ebc` | Board of County Commissioners of Bonner County | February 4, 2025 |

Each folder holds `before-calendar-meeting-day`, `after-1-calendar-attend`, `after-2-calendar-marked`, `after-4-panel-agenda`, `after-5-panel-spoke` and `after-6-people`, each `-1440x900.jpg`.

## Before, on main

In all three places the Calendar plate for February 4 lists the meeting ("The Carbon County Board of Commissioners meets") with no control. A resident has no way into the room.

## After

### Hanna, Wyoming

- Calendar, February 4: "The Carbon County Board of Commissioners meets" with the control **Attend**.
- Once pressed: "At 9 a.m., you plan to go to the Carbon County Board of Commissioners meeting." with the control **Not going**.
- The panel at 9:00 AM, titled "Carbon County Board of Commissioners": "You can speak for or against any of the two items before the Carbon County Board of Commissioners votes." Each item has **Read the bill**, **Speak for** and **Speak against**; the panel closes with **Leave**. No Yes, No, Abstain, Decide for me or Adjourn.
- After Speak for on "Budget Ordinance": "SPOKE FOR · 1" and "Isabel Mathews".
- The next day: Ordinance 2025-3 enacted, seven votes on its roll call. People lists seven of the board's seven members: Melissa Munoz, Mary Griffin, Stella Watkins, David Carr, Marcus Valenzuela, Madison Hubbard, Laura Rowe. The picture has Melissa Munoz's card open ("You barely know each other").

### Pawleys Island, South Carolina

- Calendar, February 4: "The Georgetown County Board of Commissioners meets" with **Attend**.
- Once pressed: "The Georgetown County Board of Commissioners meeting at 9 a.m. is on your day." with **Not going**.
- The panel, titled "Georgetown County Board of Commissioners": "You can speak for or against any of the three items before the Georgetown County Board of Commissioners votes."
- After Speak for on "Budget Ordinance": "SPOKE FOR · 1" and "Elise Woodward".
- The next day: Ordinance 2025-4 enacted, seven votes. People lists seven of seven: James Merritt, Victor Merrill, Delaney Chapman, Dylan O'Neill, Diego Mendoza, Jacob Whitaker, Heidi Whitaker.

### Priest River, Idaho

- Calendar, February 4: "The Board of County Commissioners of Bonner County meets" with **Attend**.
- Once pressed: "At 9 a.m., you plan to go to the Board of County Commissioners of Bonner County meeting." with **Not going**.
- The panel, titled "Board of County Commissioners of Bonner County": "You can speak for or against the one item before the Board of County Commissioners of Bonner County votes."
- After Speak for on "Budget Ordinance": "SPOKE FOR · 1" and "Brooke Stephens".
- The next day: Ordinance 2025-3 enacted, three votes. People lists three of three: James Hammond, Ayanna Welch, Cathy McLean.

## Lines not in these three pictures

- The third wording of the plan, played in Pawleys Island at an earlier meeting: "The Georgetown County Board of Commissioners meets at 9 a.m., and you're going."
- The line for an agenda with nothing on it, three wordings, each played once before the first meeting of a new life stopped being offered (its members file on the day, so its agenda was not really empty): "The Carbon County Board of Commissioners has nothing on its agenda for January 21.", "No item is before the Georgetown County Board of Commissioners on January 21.", "Nothing is up before the Board of County Commissioners of Bonner County on January 21." A meeting whose members file nothing the day before still says it. No picture of it is kept here.

## What the walks found

- Nothing is told to the player between leaving the room and the next morning in any of the three places. The scene Fable A listed for the hearing itself did not come up for a resident.
- The members who heard the speaker are listed on People under Others. Sorting an official the player has met under Politics is pool item `people-screen-officials-met-sort-under-politics` (#8986).
- In Moro, Illinois (seed `3b908bda-8022-49b0-9e84-ec5415720393`) the one item, a repeal of the county's civilian police oversight, died without a vote: the law it would repeal was passed but not yet in force, so the board found it moot (dev mode's bill outcome says how: "moot"). Nobody is heard on an item that is not voted, so no member met the speaker there. That place is not among the pictures.
