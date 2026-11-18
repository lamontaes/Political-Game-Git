# Menu test: every rule the owner has set (cumulative, from round 5 on)

This file replaces the round 1 rules. It holds **every** ruling from Nov 5 to Nov 17, not only the newest notes. Each round must pass every line here. A later note adds a line; it never drops one. If two lines seem to disagree, the later date wins and the conflict goes in your PR body.

Why it exists (the owner, Nov 17, on round 4): "It just defaulted back to floating text and regressed in many of the UI elements that I wanted. And a lot of this is just dead space." Earlier rounds got only his newest notes, so approved pieces were lost.

## Start from these

- **The keeper (base for every screen):** round 3's Government screen, `approved/government-round3-keeper.png`. Its files are on branch `menu-test-3b1/sol-politics`: `docs/menu-test/out3/sol/government/index.html`, with `../politics/menus.css` and `../politics/art/`. Keep its structure: the place's painting on one side, the title plate on it, and the content beside it filling the frame. Fix what he called out (below): the boxed rows, the photo-real painting and the hard picture edge.
- **His approved screens** (rendered from the game's menu examples, Nov 5 to 7):
  - `approved/you-ol-g.png`: **You** ("perfect", the reference for every menu).
  - `approved/per-hale.png`: the **person card**.
  - `approved/gov-local.png`: **Government** ("these are acceptable").
  - `approved/bud-strips.png`: **Budgets**.
- **The approved section strips:** `approved/strips.css`. Copy it into your output and use it for every group of content.

## Structure (the cure for floating text and dead space)

- **Every group of content sits in a section strip** (`approved/strips.css`): a soft header strip with the group's name, a broken thin gold outline that fades before the corners and going down, and a softly shaded body. Text never sits loose on the panel or on a painting.
- **No spreadsheet rows inside a strip** (Nov 17: "it still looks like spreadsheet rows... way too boxy"). That means no hairline row dividers, no boxed cells, no boxed chips like "5 seats", and no label-left, value-right grid. Group by spacing and type: a figure set large with its words under it, and short stacked entries.
- **Fill the frame.** Strips grow to fill the screen. No empty bands, no half-empty columns, nothing floating in space ("a ton of empty space... a transparent screen with stuff pasted on it").
- **No box around every item,** but sections must be clearly set apart. The strips do both.
- **Never a facts sheet:** labeled fact rows (Home, Work, School...) beside a figure fail. **Never a paper sheet on a panel.** **Never a plain stacked list on a background.**

## Pictures

- **Use the game's own room paintings** from `art/backdrops/` as the picture library, one picture per place or subject: council chamber, clerk's counter, party office, newsroom, home, bank, road. Reuse them across screens. They are in the game's style (thin ink lines, flat color, one shadow tone), which fixes "a little too good". Generate new art only for a subject the game has no room for, in that same flat style, never photo-real oil.
- **The picture fades into the screen at its edges.** No hard picture edge, and no brass line box around it, so the strips stand out in front.
- **No people in painted art:** no hands, figures or faces.
- **Never a big painting with a bust or card pasted on it** (Ashley's card, News in round 3). Use the keeper's layout: a side painting, the content in strips, and a bust inside the content.

## People

- **Only the game's own busts,** cropped from `art/busts/v1/sheets/` with the layers the data names. A bust runs from the head to the upper chest and ends in a soft fade (the `.bust` rule in `strips.css`), lit evenly in soft light. Never in a circle or a box. Leaders (mayor, governor, president) show as full busts, not small face crops.

## Color and type

- **Palette: the game's own colors** (`src/bench/play.css`): `--solid-top #262628`, `--solid-bottom #151517`, `--iron #1c1a18`, `--brass #9c8350`, `--gold #d6bd84`, `--brass-hi #f3dba7`, `--text #f2ede4`, `--cream #f2e6c9`, `--red #b9584a`. He also likes **red, white and blue**: make one screen each in round 3A's `civic` palette as a second version (branch `menu-test-3a/sol-palettes`, `docs/menu-test/out3/sol/elections/civic/`).
- **Text at least 15 px.** Labels are about 14 px, in capitals with letter spacing. Use Cinzel for titles only, Andada Pro for narrative, and Fira Sans with tabular, lining digits for every figure (`public/fonts/kit12/`).

## Controls

- **Hover:** a soft fill plus a frame that is brightest mid-side and fades before the corners, with warm light (about 140 ms). **Selected:** a lit brass fill. Keyboard focus is a clear 2 px outline.
- **None of these:** chevrons, a left bar on rows, corner marks on controls, sliders, bar graphs, pie charts, little charts, checkboxes, or icons and symbols standing in for facts. Filters are lit toggle buttons.

## Data (against slop)

- **Only the game-exported JSON for that screen** in `docs/menu-test/inputs/data/`. Every name, number, date and sentence on screen must come from it, with headings only from its `labels`. Invent nothing; anything you wish you had goes under "Wanted from the game" in the PR body. The CTO checks every string against the data with `check_pages.py`.
- **Write dates the game's way:** "June 2, 2026", never "2026-06-02".
- **Parties shows every party** the world has in that place, minor ones too (round 4's Libertarians stay).
- **Budgets** follows The Political Process: departments with their heads' busts, each program with what it pays for, what was asked and last year, and running totals in view. Never a table.
- **Metrics:** numbers first.

## Words and limits

- **No captions or subtitles:** no explaining line under an item, number or heading. No developer text, no system math, and American English only (never "ward", "councillor", "colour").
- **No timelines** on person cards or You.
- **The menu never scrolls** as a page. Each page is exactly 1440 × 900, static HTML and CSS, with at most one click per page.
