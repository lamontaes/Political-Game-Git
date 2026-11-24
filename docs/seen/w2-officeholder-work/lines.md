# An officeholder's card: the office, not the seat's pay as a job

Each card's lines under the name, read with `knownCard` in a drawn world (`buildBenchWorld`). "Before" is main 93ee1a35c1 and "after" is this branch. The title inside a sentence now follows one rule, lower case except a word in capitals, so "U.S. Senator" reads "U.S. senator".

In Warwick, Rhode Island (seed `w2h1`), 124 officeholders' cards said "Works as <a seat's key> at <a treasury>" before this change, and none do after it. Olney Springs, Colorado (`w2h3`) and Brownfields, Louisiana (`w2h4`) also have none after.

| Office              | Before                                                                                                                          | After                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| President           | Has served as president since 2025. Works as president at US. Was vice president before that. Born in 1967.                     | Has served as president since 2025. Was vice president before that. Born in 1967. |
| Vice President      | Has served as vice president since 2025. Works as vice-president at US. Born in 1972.                                           | Has served as vice president since 2025. Born in 1972.                            |
| U.S. Senator        | Has served as U.S. Senator since 2025. Works as us-senate at US. Born in 1948.                                                  | Has served as U.S. senator since 2025. Born in 1948.                              |
| Governor            | Has served as governor since 2023. Works as governor at Rhode Island treasury. Born in 1977.                                    | Has served as governor since 2023. Born in 1977.                                  |
| Lieutenant Governor | Has served as lieutenant governor since 2019. Works as lieutenant-governor at Rhode Island treasury. Born in 1968.              | Has served as lieutenant governor since 2019. Born in 1968.                       |
| State Senator       | Has served as state senator since 2021, reelected each time. Works as legislature-upper at Rhode Island treasury. Born in 1981. | Has served as state senator since 2021, reelected each time. Born in 1981.        |

## On screen, 1440x900

The bench, a new life, then Politics. The federal executive's card is opened from the President's name, and a state legislator's from the first member card. Before is main 4dcd2a0b6e, after is this branch at e11cc5c88e. Pictures: `before-<card>-<seed>.png` and `after-<card>-<seed>.png`.

| Place (seed)                                              | Card                                 | Before, "Who she is" or "Who he is"                                                                                                      | After                                                                                               |
| --------------------------------------------------------- | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Tatum, South Carolina (`w8-q`)                            | President Laura Salas                | Has served as president since 2025. Works as president at US. Born in 1962.                                                              | Has served as president since 2025. Born in 1962.                                                   |
| Tatum, South Carolina (`w8-q`)                            | State representative Robert Gonzalez | Has served as state representative since 2020, reelected each time. Works as legislature-lower at South Carolina treasury. Born in 1980. | Has served as state representative since 2020, reelected each time. Born in 1980.                   |
| Woonsocket, Rhode Island (`w8-f`)                         | President Nancy Waters               | Has served as president since 2025. Works as president at US. Was governor of Ohio before that. Born in 1962.                            | Has served as president since 2025. Was governor of Ohio before that. Born in 1962.                 |
| Woonsocket, Rhode Island (`w8-f`)                         | State representative Daniel Roberson | ... Works as legislature-lower at Rhode Island treasury. Born in 1987.                                                                   | Has served as state representative since 2021, reelected each time. Born in 1987.                   |
| Athens, Michigan (`f8aee52b-7aa0-45a2-a3f7-6820913dd30f`) | President Stephen Armstrong          | ... Works as president at US. Was a U.S. senator from North Dakota before that. Born in 1977.                                            | Has served as president since 2025. Was a U.S. senator from North Dakota before that. Born in 1977. |
| Athens, Michigan (`f8aee52b-7aa0-45a2-a3f7-6820913dd30f`) | State representative Heather Nichols | ... Works as legislature-lower at Michigan treasury. Born in 1979.                                                                       | Has served as state representative since 2025. Born in 1979.                                        |

## The complaint it answers

- The owner, Nov 1, on an officeholder's card ("Under her name, she told legislator. That's not good. There needs to be more text."; "Elected legislator, it needs to be told like a story. How many times do I have to say that?"). The lines under an officeholder's name are the office as a story; "Works as legislature-lower at Michigan treasury" is a record key read out.
- His standing rule, in AGENTS.md: screens show record data only through worded labels, never raw kinds or ids.
- Fable A on the crew line, Nov 12, 22:14Z, on main's President card: "Works as president at US. ... The card's work line is treating an office as a job at an employer."
