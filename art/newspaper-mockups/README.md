# Newspaper mockups (Firefly, Oct 14–15, 2026)

The owner asked for these in the game (Oct 28: "pull the newspaper mockups... I don't understand why those aren't in the game"). `all-newspaper-mockups.jpg` shows all twelve.

| File                                               | What it is                                                                                                                                                                |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `masthead-daily-1.png`, `masthead-daily-2.png`     | Masthead frames for a daily paper: engraved border, eagle, blank name plate, column rules below. The paper's name and the date go in the blank plate.                     |
| `front-page-daily-1.png`, `front-page-daily-2.png` | Fuller daily front-page frames: masthead plus a ruled page area.                                                                                                          |
| `masthead-weekly-1.png`, `masthead-weekly-2.png`   | Masthead frames for a small-town weekly, with a courthouse or town-hall engraving.                                                                                        |
| `story-council-1.png`, `story-council-2.png`       | Front-page photo: a city council meeting, a vote in progress.                                                                                                             |
| `story-governor-1.png`                             | Front-page photo: a governor signing a bill in the statehouse. `story-governor-2.png` stays on the art branch only: its face closely resembles a real governor.           |
| `story-president-1.png`                            | Front-page photo: a president's victory night on stage with confetti. `story-president-2.png` stays on the art branch only: its face closely resembles a real politician. |

Generator: Adobe Firefly, Gemini 3.1 (Nano Banana 2), image edits at 1K; 1365–1376 × 768.

## In the game (Oct 28, 2026)

The News front page and the evening news reader serve cuts from `derived/` at `/art/newspaper/<file>` (src/bench/handler.ts); `engraveMasthead` and `storyPhoto` in src/bench/play.mjs choose them. Each derived file is cut from the original beside it (pixel boxes on the original):

| Derived                                                      | Original                                     | Cut                                                                                                                     |
| ------------------------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `derived/masthead-daily-1.jpg`                               | `masthead-daily-1.png`                       | box 45,65,1332,402: the cream strip                                                                                     |
| `derived/front-page-daily-1.jpg`                             | `front-page-daily-1.png`                     | box 75,82,1300,355: the masthead above the columns                                                                      |
| `derived/masthead-weekly-1.jpg`                              | `masthead-weekly-1.png`                      | box 83,102,1293,380                                                                                                     |
| `derived/masthead-weekly-2.jpg`                              | `masthead-weekly-2.png`                      | box 85,109,1290,350                                                                                                     |
| `derived/story-council-1.jpg`, `derived/story-council-2.jpg` | `story-council-1.png`, `story-council-2.png` | whole picture, 960 wide                                                                                                 |
| `derived/story-governor-1.jpg`                               | `story-governor-1.png`                       | the applauding lawmakers left of the desk (box 72,180,392,500 at 960 wide), 720 wide: no governor's face, no state flag |

Not used in play: `masthead-daily-2.png` and `front-page-daily-2.png` (dark plates that do not take ink), `story-president-1.png` (its one face would stand for the president, who is a generated person with a face of their own) and the governor's own face and flag in `story-governor-1.png` (a face that would not match the record; one state's flag in every state).
