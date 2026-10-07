# Home presence at life start: a proposal for the CTO

HOLD: needs CTO design call. This draft is kept out of the merge loop.

A new life no longer opens with a written scene, so nobody was recorded in the room at home. This proposal records the people the world already has at home when play begins, from the household record and each person's work week. Across 14 random places, a housemate was in the room in 0 lives before and 2 after. In most lives the housemate really is at work at 9:10 a.m. on a Monday, so the room is empty and that is true. The real gap is later: nothing records who is home on any later day.

## What I found

Two writers put a new player at home, and neither put anyone else there.

- The household start writer records the player alone. Now it adds the household members the world has at home at that moment.
- The job-holder start writer, used when the player has a job and is off shift, recorded no home presence at all, so a working adult who starts at home had no room. It now records the player and the housemates at home, and is marked as the starting placement so the room reads it.

Who is home comes from the household record and `whereaboutsAt`: alive, not on shift, not at a recorded activity, and not a minor in class during the school week. Nothing is drawn. The same helper answers for any moment, so the evening can be read from the same records.

## The 14 watched lives

Each life is drawn from the 56 places by seed, 34 years old, sharing a home. The start moment is 9:10 a.m. on Monday, January 5, 2026.

| Seed       | Place                          | Where the player starts | Housemate | Room before | Room after                                    |
| ---------- | ------------------------------ | ----------------------- | --------- | ----------- | --------------------------------------------- |
| h1-home-1  | Axis, Alabama                  | home                    | at work   | none        | player alone                                  |
| h1-home-2  | Westbrook, Maine               | at work                 | at work   | none        | unchanged                                     |
| h1-home-3  | Plymouth, New Hampshire        | at work                 | none      | none        | unchanged                                     |
| h1-home-4  | Lowell Point, Alaska           | home                    | home      | none        | housemate in the room, conversation available |
| h1-home-5  | Putney, Vermont                | home                    | none      | none        | player alone                                  |
| h1-home-6  | Perry, Georgia                 | home                    | none      | none        | player alone                                  |
| h1-home-7  | Zion, South Carolina           | home                    | at work   | none        | player alone                                  |
| h1-home-8  | Spiritwood, North Dakota       | home                    | at work   | none        | player alone                                  |
| h1-home-9  | Elberta, Alabama               | home                    | at work   | none        | player alone                                  |
| h1-home-10 | Charco, Arizona                | home                    | none      | none        | player alone                                  |
| h1-home-11 | Camp Springs, Maryland         | at work                 | home      | none        | unchanged                                     |
| h1-home-12 | Magnolia, Delaware             | home                    | none      | none        | player alone                                  |
| h1-home-13 | Coral Bay, U.S. Virgin Islands | home                    | home      | none        | housemate in the room, conversation available |
| h1-home-14 | Clearview Acres, Wyoming       | at work                 | at work   | none        | unchanged                                     |

"Room before: none" means the household conversation room was unavailable in every one of the 14. Ten lives start at home. In the 8 of those with nobody else home, the room stays empty. For the first three seeds, the same records read at 6:30 p.m. put the housemate home in Axis and Westbrook, which is when a conversation would be possible.

## What emerged

- HARDWIRED, `src/presentation/opening-life.ts` (starting placement): the household members at home join the player's arrival record.
- HARDWIRED, `src/presentation/opening-work-location.ts` (off-shift start): the same, plus the placement mark the room reads.
- HARDWIRED, `src/simulation/living-world/home-presence.ts`: a child's school day is the same weekday school hours the town's school staff work, a game assumption shared with that schedule.
- DECIDED by the records: each housemate's own job shifts and activities decide whether they are home.

## Decisions for the CTO

1. Is recording at the starting moment enough? The 9:10 a.m. Monday start puts most working housemates at work. Starting the day in the evening would fill the room more often, but that changes the opening.
2. Should the player's arrival at home on any later day also record who is home? That is the real fix for the first month, and it means the travel writer adds the household at home to a home arrival. It is not built here.
3. Is the weekday school-hours rule right for a child in class, or should enrollment carry its own hours?

## VITAL STATISTICS

- Tests added: a generated-world test over three seeds (a housemate home, a housemate at work, a job-holder at home) and an evening read, 4 of 4 passing.
- Typecheck, eslint, prettier and the release check pass on the changed files.
- Existing tests in the touched area: 8 fail, and the same 8 fail on clean main (opening-work-location, play-scene-context and recorded-room-presence cases left behind by removing the written scenes). None are caused by this change.
- Not touched: the first-month-friend and couples tests (H3).
