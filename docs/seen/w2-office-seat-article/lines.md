# A seat that is one of several takes "a" on a person card

Bench at 1440x900: a new life, Politics, then the official's card. Before is #8975's head ab4e22df21 (this branch builds on it); after is 90ed64f1a4.

Complaint: Fable A on the crew line, Nov 13: "a seat that is one of several takes 'a' ('she became a council member', 'became a member of the board of elections'), and a seat there is one of does not ('became mayor'). Take it from the office record's seat count through the same reader, for every office, not from a list of titles."

| Place (seed), card                                                                              | Before                                                  | After                                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Woonsocket, Rhode Island (`w8-f`), Local, Legislative, a council member                         | Has served as council member since 2019.                | Has served as a council member since 2019. His story: "He won election as a council member, and won it again in 2023." |
| Athens, Michigan (`f8aee52b-7aa0-45a2-a3f7-6820913dd30f`), Local, Legislative, a council member | Has served as council member since 2022.                | Has served as a council member since 2022.                                                                             |
| Woonsocket (`w8-f`), Local, Executive, the mayor                                                | (the same)                                              | Has served as mayor since 2019. One seat, no "a".                                                                      |
| Vera, Oklahoma (`w2o11`), State, Executive, the corporation commission                          | Has served as corporation commission member since 2021. | The same. Its office record holds one seat (see below).                                                                |

The race sentences keep the office without an article: "won the race for council member", "filed to run for council member", "lost the primary for council member".

Vera's commission has 3 seats in `data/research/offices/state-offices.json`, but `stateOffices` in `src/core2/offices-state.ts` writes every statewide executive office with `seats: 1`, so the card reads it as the only seat. Filed for the offices engine; the card will say "a" the day the record holds the research's count.
