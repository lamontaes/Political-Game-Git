# Journal mock (Nov 24, 2026): a page of the story

A mock of the Journal screen for the CTO to show the owner **before anyone builds it**. No game code is changed.

Open `journal.html` from a checkout (it loads the game's own panel art, fonts and pictures from this folder). The picture is `journal-mock.png`, 1440 by 900.

## What the owner said (Nov 24, grading page 1, scene 4)

"the journal, like the big W, this is not illustrated in any kind of way. Like, that's just a tiny little paragraph. It needs to look more like a game. Like, that's just a tiny little box. The sizing isn't correct. This looks like more like a banner strip." (`docs/coordination/grading/2026-11-24-page-1-verbatim.md`, row P32.)

Today's Journal (Ali Molina, Arizona, seed c4082209): a picture strip 215 pixels high, three short sentences, and the lower third of the panel empty.

## What the mock changes

| The owner's words                             | The mock                                                                                                                                                                                                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "not illustrated in any kind of way"          | each page opens on a picture of its week, 360 and 250 pixels high, fading into the panel; the game's own pictures (the Capitol for the address, City Hall's hallway) and a bust of a person the story names                            |
| "a tiny little paragraph"                     | paragraphs set like a book page: Andada Pro 18 px at 1.6 leading, about 52 characters a line, a drop cap on the first                                                                                                                  |
| "the sizing isn't correct ... a banner strip" | the page fills the panel (the panel is its full height, the text ends 50 pixels above its foot); two facing pages, not a strip over a short text                                                                                       |
| "look more like a game"                       | the narrator's own bust in light under the chapter list; the picture leads each page                                                                                                                                                   |
| the week grouped as a memoir                  | each week is one paragraph that groups what happened, with dates in the prose and people named by who they are the first time (Gene, "My dad," then Ms. Doss, "the clerk"); no list of dated lines, no year headers, no feelings named |

## Under the menu look (MENU-LOOK, checked line by line)

- One dark see-through panel with the brass edge and small corners; no box around anything; pictures fade into the panel at their edges; busts end in a soft fade, in a pool of light.
- A list beside its page (the chapters, "My story"); a selected row is a lit brass fill; no arrows, no "1 of N", no page numbers on the story, no subheadings, no subtitles, no developer text.
- Type: Cinzel for titles, Andada Pro for the story only, Fira Sans for the list; labels 14 px and up, body 18 px.
- No paper sheet: the type is set straight on the panel.

## The guards pass it (run on the mock at 1440 by 900)

The `ui-look` scans (`tests/support/ui-look-scan.mjs`, and the four new ones in #10476) run on `#sheet` of `journal.html`:

| Rule                                                | Result                                                       |
| --------------------------------------------------- | ------------------------------------------------------------ |
| A, box in a box                                     | no hits                                                      |
| B, scroll with free space                           | no scroller                                                  |
| C, text cut at a box's edge                         | no hits                                                      |
| D, one fact shown twice                             | no hits (the date "June 21" appears once, "January 20" once) |
| E, headline leading under 1.3                       | no hits                                                      |
| F, a title over a picture it cannot be read against | no title sits on a picture                                   |

## References

The Game UI Database (https://www.gameuidatabase.com) answers 403 from this container (a Cloudflare challenge), so no screens were pulled from it. The references are the owner's own approved mocks, which follow the same games:

- **You** (`docs/mocks/2026-11-07-approved/`, key `you-ol-g`, approved Nov 7): a bust in light beside first-person strips. The Journal's narrator bust and first-person voice follow it.
- **Person card** (same folder, `per-hale`, "perfect"): the page set in the owner's voice about someone, with a bust and no facts sheet.
- **Government** (`gov-local`, `gov-state`, `gov-federal`): a painted picture that leads the screen and fades into the panel; the Journal's page pictures do the same.
- **Budgets** (`bud-strips`): a typed page with the person's bust.
- **Today's Journal** (the screen above): its drop cap and its picture are kept; the picture grows and the text fills the page.
- **Wildermyth, The Political Process and Suzerain** are the reference games for a story page. Their screens were not pulled (the site's 403 above); the Nov 7 examples for Suzerain and Wildermyth in the approved folder were judged for the You screen, not for a story page. If the CTO wants fresh Game UI Database references for a journal or diary page, someone with access to the site pulls three to five and I add them here.

## Questions for the CTO and the owner

1. **A long chapter.** The mock shows a chapter that fits its two pages. A longer one scrolls inside its own page box (a bounded box that scrolls inside itself, as MENU-LOOK allows), with the box's edge on a line, never cutting one. No arrows. Is that acceptable, or should a long chapter split into two chapters in the list?
2. **Where a revised entry shows.** The owner ruled that later life rewrites an earlier entry ("Little did I know ..."). The mock shows the entry as it reads now; the rewrite is the same paragraph with new words, so no new part of the screen.
3. **The pictures.** Each page's picture comes from the game's scene pictures (`situationPlaces`): the place where the week's main thing happened. A week with no fitting picture ships on the fallback and a line in the pictures-wanted list (the Nov 14 rule), never a hold.

## What a build would reuse

`rosterScreen` (a list beside a page), the bust piece (`src/bench/ui/bust.mjs`), the scene pictures (`situationPlaces`), the bounded page box (`pager`), the one panel; the words come from the English engine's Journal banks (journal-writer). The sample text here is not the engine's.

## Files

`journal.html` (the mock), `journal-mock.png` (its picture), `fonts/` (the game's fonts; their licenses are in `public/fonts/kit12`), `img/` (the panel art, four of the game's pictures and two pack figures).
