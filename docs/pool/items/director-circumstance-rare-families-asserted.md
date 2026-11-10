---
id: director-circumstance-rare-families-asserted
title: "A price change, a known death, a hire and a rival's message call a scene often enough in a played year that the circumstance test can assert them"
area: director
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: design-story-director
lead: director
source: director lead, #6263 CI, Oct 27
checked: fable 2026-11-10
---

**What.** `src/director/circumstance.test.ts` asserts only the families every drawn year carries, because four rows fire once or never in a year of one town. On seeds adf2b240b2d518b4f73a5c107884f60b75c71249 and 28a43cad632afa618a63b16b1fc951c92738e133 over five worlds each, price-moved-street and rent-news-street fired 0 times. death-known-street fired 4 and then 0 times, rival-message 0 and then 1, and new-coworker 4 and then 7. Asserting them made the test pass or fail by the draw, and playing more worlds to find them ran past CI's 45-minute unit job. Guards: the street and workplace scenes for a price change, a death, a hire and a rival's message, which should reach a player in a year; the director test asserts them.

**Cause.** Needs cause. Looked at: `src/director/circumstance.test.ts` (header lines 53 to 55) counts price-moved-street, rent-news-street, death-known-street, new-coworker, rival-message and lobbyist-hallway but cannot assert them, and seeds adf2b240b2d518b4f73a5c107884f60b75c71249 and 28a43cad632afa618a63b16b1fc951c92738e133 gave 0 for the first two. Why each is rare was not traced.

**Fix.** None until the cause is found.

**Time box.** 6 hours for one Opus session, to find why each row is rare and then fix the cause.

**Rules.** Ask why: name, by record, why each is rare. A law's price change may seldom reach a person the player knows (`law.effect-learned` with `priceRuleId`); no printed story may carry the rent web fact; a rival's paid message may need a contested race the filed player seldom enters. No dice: never raise a rate to make a scene fire; fix the cause (the reach, the story kind, the race chosen). Speed: the test stays within one CI unit job.

**Done when.** A second session plays three fresh drawn seeds (buildBenchWorld, played through the player clock, four ways of playing, record ids printed) and each of the four rows fires at least once in every one. The circumstance test asserts all four again and runs within one CI unit job, and the second session names the cause of each row's rarity by record.

**Waits on.** Nothing.

**Files.** src/director/circumstance.test.ts, src/director/data/circumstances.json

**Notes.** Counted and printed by the test meanwhile; each was shown by record id in #6263's played years.

Oct 27, 14:05 (director lead): the lobbyist after a lobbying visit to the player (lobbyist-hallway, #6269) joins the four: 0 scenes on seed adf2b240b2d518b4f73a5c107884f60b75c71249, 1 on 28a43cad632afa618a63b16b1fc951c92738e133 and 1 on director-circ-1, so it is counted, not asserted, too.
