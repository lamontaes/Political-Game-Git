---
id: director-circumstance-rare-families-asserted
title: "A price change, a known death, a hire and a rival's message call a scene often enough in a played year that the circumstance test can assert them"
area: director
kind: bug
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: director
source: director lead, #6263 CI, Oct 27
---

**What.** `src/director/circumstance.test.ts` asserts only the families every drawn year carries, because four rows fire once or never in a year of one town. On seeds adf2b240b2d518b4f73a5c107884f60b75c71249 and 28a43cad632afa618a63b16b1fc951c92738e133 over five worlds each, price-moved-street and rent-news-street fired 0 times. death-known-street fired 4 and then 0 times, rival-message 0 and then 1, and new-coworker 4 and then 7. Asserting them made the test pass or fail by the draw, and playing more worlds to find them ran past CI's 45-minute unit job.

**Rules.** Ask why: name, by record, why each is rare. A law's price change may seldom reach a person the player knows (`law.effect-learned` with `priceRuleId`); no printed story may carry the rent web fact; a rival's paid message may need a contested race the filed player seldom enters. No dice: never raise a rate to make a scene fire; fix the cause (the reach, the story kind, the race chosen). Speed: the test stays within one CI unit job.

**Done when.** Each of the four rows fires at least once in every one of three fresh drawn seeds (buildBenchWorld, played through the player clock, four ways of playing, record ids printed), the circumstance test asserts all four again, and the test runs in under 25 minutes on CI.

**Files.** src/director/circumstance.test.ts, src/director/data/circumstances.json

**Notes.** Counted and printed by the test meanwhile; each was shown by record id in #6263's played years.

Oct 27, 14:05 (director lead): the lobbyist after a lobbying visit to the player (lobbyist-hallway, #6269) joins the four: 0 scenes on seed adf2b240b2d518b4f73a5c107884f60b75c71249, 1 on 28a43cad632afa618a63b16b1fc951c92738e133 and 1 on director-circ-1, so it is counted, not asserted, too.
