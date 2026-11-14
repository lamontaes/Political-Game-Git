# Your family looks like the person you made: before and after

Owner, Nov 8, 2026: "I'm Mexican and my son is white."

This change changes whose face is drawn, not any word. The roster, the roles ("Son", "Mother", "Brother"), the card sections and the story text are the same before and after; no bank line, label or heading changed. The lines as played, read from the People screen, are in the pictures.

Three drawn places (random draw from all localities, seed 85680): Litchfield IL (geoid 1743965, world seed `8568-litchfield`), Eldorado PA (4222856, `8568-eldorado`), Hollandale MN (2729636, `8568-hollandale`). In each, a new life from the creator with the deep skin tone and a woman player, at 1440x900. Before = the train head 9ed4bf9c; after = this branch. Because the family is drawn from the identity the creator passes, the two worlds are not the same people; the comparison is who the player's family looks like.

The rule is by how people are related, not by who shares the house. The player's blood family (parents, brothers and sisters, children, grandparents, grandchildren, aunts, uncles, nieces and nephews) takes the chosen origin. A partner, in-laws, step-relatives and housemates keep the origin they were drawn with, as in life: the player of one tone can have a partner of another and children who look like the player.

`people-before-*.png` and `people-after-*.png` are the People screen with the first family card open, before (train head) and after (this branch), one pair per place. In each "after" picture the player's relatives (Raymond Valenzuela, father, in Eldorado PA; Samantha Todd, daughter, in Hollandale MN; the family in Litchfield IL) are drawn in the player's deep tone. The "before" pictures show the same creator choice with the family in the place's drawn tone.

Partner and housemates are proved in `src/bench/creator-origin.test.ts` (pinned places Liberty MS, Eldorado PA, Litchfield IL, Midland LA, a 1980-born woman): Carlos (partner, Liberty MS) and James (partner, Midland LA) keep their drawn origin while their children and the player take the chosen one. With the rule set to "everyone in the household", the test goes red at the partner in Liberty MS.

Those in each picture who are not family keep the place's own mix.
