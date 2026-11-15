# Every news lead has a picture of what it is about: before and after

Owner, Nov 8, 2026, about 2:10 p.m. (Manchester, Connecticut, v0.94.0), on News: "There's no story. There's no pictures. Again, it's just a black screen."

This change adds a picture to each paper's lead story, chosen from the story's own record (the room of the body that acted, the capitol or the White House for a law or a nomination, a business, a home). The paper's words are the same before and after except none are new: the carried "Nothing in print yet." label is not needed, because the train already says "Nothing here yet." for an empty paper, and the carry keeps the train's. No word or label was added.

Before = the train head (e24cb825, no pictures on any lead but a few state stock rooms). After = this branch. Three pinned places, each a new life in that world, News on day one and after each of four weeks, every paper's tab, 1440x900:

| Place                   | Seed              | Leads before     | Leads after | Example shown (`news-before-*.png`, `news-after-*.png`)                                                              |
| ----------------------- | ----------------- | ---------------- | ----------- | -------------------------------------------------------------------------------------------------------------------- |
| Litchfield IL (1743965) | `8568-litchfield` | 2 of 12 pictured | 12 of 12    | week 4, tab 7: "Senate confirms Robert McLean as Secretary of Agriculture", the White House                          |
| Eldorado PA (4222856)   | `8568-eldorado`   | 2 of 18 pictured | 18 of 18    | week 4, tab 1: "Logan Township Board of Supervisors passes Ordinance 2025-2, 3 to 0", the township's council chamber |
| Hollandale MN (2729636) | `8568-hollandale` | 1 of 19 pictured | 19 of 19    | week 2, tab 6: "Local income tax authority became law on January 9, 2025.", Minnesota's capitol                      |

`leads-before-*.txt` and `leads-after-*.txt` are the check's logs: every lead, the picture chosen and the record it came from. `src/bench/news-picture.browser.mjs` is the check (`NEWS_PLACE_KEY`, `NEWS_SEED` name the place; `NEWS_BEFORE=1` records without asserting).

Not met, and said plainly: a paper that printed one story still leaves most of its right side empty (the "No panel more than half bare" row of the item). Filling it needs more stories, which is the Words items `words-paper-side-stories` and `words-paper-and-journal-everyday-life`. No business lead came up as a lead in these three worlds; the business path is proved in `src/bench/news-picture.test.ts` (Port Carbon PA, seed `0f65a5e68e006abb:0`).
