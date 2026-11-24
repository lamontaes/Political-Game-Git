# Replay table (Nov 24, lane 9)

Raw links: https://raw.githubusercontent.com/lamontaes/Political-Game-Git/claude/pt-shots-replay/<file>. Every line played the bench build of main `db0398d4` (the head after the CTO's ten merges; nothing else had merged at 05:21Z) at 1440x900, unless a line says otherwise. Title-screen rows have no place; life rows name theirs.

| Row | His words | PR and head | Place and seed | Grade | Picture | On screen |
| --- | --- | --- | --- | --- | --- | --- |
| P2 | "when I click new game, the patch notes still stay on top of it." | #10297, main db0398d4 | title screen, no life | **pass** | replay-p2-patchnotes-open.png, replay-p2-after-newgame.png | Patch notes open, then New game: the Patch notes sheet is gone and only the New game sheet (Start a life / Advanced) is over the painting. |
| P1 | "the patch notes menu is good, except ... why are there 4 scroll wheel bars?" | main db0398d4 (no merged PR aims at it; lane 2) | title screen | **fail** | replay-p1-patch-0107.png | The page shows no visible scrollbar in headless, but the builds list is three nested scroll containers (list 553px in 414px, pager 8,422px, page 6,158px) in a panel with free room below; 100+ builds sit in a scroller. Can't prove his "4 bars" visually here. |
| P4 | "I'll be 50, no, not from the Virgin Islands... one Random draws the whole character" | #10301, main db0398d4 | creator, no life | **pass** | replay-cr-2-random.png | Random fills gender, name, birthday, state and town (Nashua, New Hampshire), and the look in one press; no separate Random place button on the sheet. |
| N16-7 | no person before a gender is picked | main db0398d4 | creator | **pass** | replay-cr-1-open.png | Start a life opens with no bust until a gender is chosen. |
| N16-10, N16-11 | skin and colors as swatches, hair as pictures | main db0398d4 | creator | **pass** | replay-cr-2-random.png | Skin and color rows are round swatches; head, hair, facial hair and top are small pictures. |
