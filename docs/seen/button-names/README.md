# Act names in the game (#9233, Nov 14)

Names are read from the Your office strip, "What you have done", in the running game.

| Seat and place                                                                         | What was pressed                                         | Rows the strip showed                                               | Screen                                                 |
| -------------------------------------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------ |
| Supervisor, Soda Springs, California, seed 194e69b4-52e6-49d4-b800-934eba5b5261        | Speak for, Yes and Abstain on a board item, then Adjourn | Give a speech, Vote (Yes), Vote (Abstained), Meet a department head | council-pressed-strip.png, council-pressed-meeting.png |
| Council member, Glen Alpine, North Carolina, seed e95aebb7-98b1-43c1-9e70-c971cebf57e6 | stops off, then on; adjourn                              | Vote (absent), Vote (abstained), Meet a department head             | absent-row.png, adjourned-row.png                      |

Seen as the player sees them: Give a speech, Vote, Meet a department head (3 of the 21 act names).

Not reached by pressing: the other 18 names (help a resident with a problem, hold office hours, hold a town hall, give an interview, name a department head, talk to a colleague about your bill, cut the ribbon, sign a bill, veto a bill, give your yearly address, and the eight everyday acts: work, rest, get in touch with someone you know, take care of a relative, join a group, visit an office, hold a meeting, look it up). Two years played unattended at a commissioner, a mayor, a U.S. Representative and a governor wrote no act rows beyond a meeting with a department head: those acts are offered to the player on a day (a town hall when it is due, the state of the city in its season, a ribbon when a public project is finished, a vacant post to fill) and none came up in the seats and years tried. Their names are checked in `src/bench/action-names.test.ts` (served names for every act key), not seen in the strip.
