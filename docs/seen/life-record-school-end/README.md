# The end of high school on a person's card (#8927)

The owner, Nov 8, 2026: "None of my history is simulated. I can't see anything that my character went through. No, a girlfriend or a car accident or college or whatever." Before this change, an adult's card told the years school started and never when it ended.

Each picture is the card a player opens from "Who I am" on the first evening, for a person at home. Before is main at fd590ccd87; after is #8927 at 2e84cd20b5. Every line on each card is in the `lines.md` beside its picture. The script that took them clicks what a player clicks: "Who I am", then the person's name.

| Place and seed                   | Person                     | Before                                              | After                                                                                                                                                            |
| -------------------------------- | -------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cayuse, Oregon (seed lrcard01)   | Shannon Garcia, the father | "At 14, he went on to high school."                 | "At 14, he went on to high school. He graduated Cayuse Public Schools in 1996."                                                                                  |
| Mars Hill, Maine (seed lrcard02) | Heather Lynch, the mother  | "Later, in 1993, she moved up to high school."      | "Later, in 1993, she moved up to high school. She finished at Mars Hill Public Schools in 1997."                                                                 |
| Angoon, Alaska (seed lrcard03)   | Thomas Hardy, the father   | "At 5, Thomas Hardy went to school back in Alaska." | The same. He went to school in a place the world keeps no school record for, and the bank's line for the end of school names the school, so nothing new is told. |

College is not on any card yet: its three lines are Story's to write (the pull request names the spots), and the card leaves out a line the bank cannot fill.
