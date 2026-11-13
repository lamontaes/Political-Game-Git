# An earlier partner and a hospital stay on a person's card (#8670 with #8957)

The owner, Nov 8, 2026: "None of my history is simulated. I can't see anything that my character went through. No, a girlfriend or a car accident or college or whatever."

Each picture is the card a player opens from "Who I am" on the first evening, for a person at home. Before is main at fd590ccd87; after is #8957's branch with W2's other-parent lines (c28a51a30c, read and passed by Fable A): #8670's passes, W2's lines, the child's-other-parent change and the dating fix. Every line on each card is in the `lines.md` beside its picture.

| Place and seed                        | Person                       | Before                       | After                                                                                                                                                |
| ------------------------------------- | ---------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cayuse, Oregon (seed lrcard01)        | Elizabeth Garcia, the mother | No stay.                     | "She spent time in the hospital in 2018."                                                                                                            |
| Angoon, Alaska (seed lrcard03)        | Thomas Hardy, the father     | No earlier partner, no stay. | "Amanda arrived in 2004. You came into the world in 2007. He separated from Lisa Stein, your mother, in 2020." and "He had a hospital stay in 2014." |
| Diamondville, Wyoming (seed lrcard04) | Erin Farmer, the mother      | No earlier partner, no stay. | "... You arrived in 2007. She separated from Jamie Vincent, your father, in 2011." and "She spent time in the hospital in 2012."                     |

Before the dating fix on #8957, every separation and stay in these three places read "in 2006", the eve of the world's window. In Angoon and Diamondville the player's other parent is on record, so the earlier partner is that parent, by name, and the card says so to the player ("your mother", "your father").

## Piti, Guam (seed lrparent02), where the test found the case

The three town adults whose children have another parent on record, as the player reads their cards. These people are not in the player's home, so they are lines, not pictures (`knownCard` from the player, with every town adult's past opened, as `past-partners.test.ts` draws the place):

- "He separated from Lisa Akhtar, his son's mother, in 1998." (`person_238bbf2c7ce0e70e`, `family.partnership-ended:person_238bbf2c7ce0e70e`)
- "She separated from Brandon Wiggins, her children's father, in 2020." (`person_2967924d21d5b409`)
- "He separated from Sara Singh, his children's mother, in 2022." (`person_08572b35db87fe05`)

Before W2's lines, each read "He separated from Lisa Akhtar in 1998.", with nothing saying who she is to his son. An earlier partner who is no child's other parent keeps the plain line ("She separated from George Greer in 1994.").
