---
id: play-your-life-draws-a-full-body-figure
title: "Your life and Jobs and study draw the player as a full-body figure, where the owner ruled busts only (seen in Blodgett Landing, New Hampshire)"
area: play
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Against your newest rulings (measured)")
---

**What.** Measured by the audit on Nov 9 in Blodgett Landing, New Hampshire (a random world; the audit gives no seed): "Your life shows a full-body figure." Its screenshot `docs/audits/fable-vision-2026-11-09-screens/01-your-life-four-lines.jpg` (branch audit/fable-vision) shows the Your life tab with a seated woman drawn head to shoes in a tall frame at the left. Read in code on main, Nov 10: in `openSheet` in `src/bench/play.mjs` the You tab uses the approved strip screen with a bust, while the other two tabs of the group keep "the side figure" (comment at line 5245): `fillArtwork` (`src/bench/ui/picture.mjs`, line 12) fills `#sheet-media` with the whole figure from `portraitUrl()` (line 3167) at line 5257, under the class `character-sheet`. Fix the class: no menu draws a full figure; Jobs and study and Your life show the same bust the You tab shows, from the same face record, and the full-figure slot, its picture source and its styles are deleted.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: `fillArtwork`'s figure, `portraitUrl`, the `#sheet-media` slot and the `character-sheet` and `screen-portrait` styles go in the same change that puts the bust on these tabs. Owner, Nov 7, about 4:50 p.m. (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 50): "No, remember, we're going to keep the busts because that's easiest to do. Unless you can... no, let's just do the busts. On the page. The full body, we keep coming with problems with that." The digest adds: "No full-body figures on menus; the Figure switch is removed."

**Done when.** A different session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof), opens You and takes a screenshot at 1440×900 of each of its three tabs. All three must show the same bust, head to upper chest ending in a soft fade, of the same face. None may show legs, a seated or standing whole figure, or a tall framed picture beside the text. The session then opens every other menu from the rail and confirms none draws a whole figure. The same three screenshots are then taken in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro, and set beside the approved example `you-ol-g` in `docs/mocks/2026-11-07-approved/menu-examples.html`. The owner plays it: he clicks through You, Jobs and study and Your life and sees the same bust of his character on each.

**Files.** src/bench/play.mjs, src/bench/ui/picture.mjs, src/bench/ui/strips.mjs, src/bench/play.css, src/bench/play.html

**Notes.** From the audit's Pillar 6 and its "Reported done" item 8 ("the withdrawn timeline and full figures remain"). The creator also draws two full-length figures; that is play-new-game-and-creator-open-without-busts (filed Nov 10). The figure and the bust come from different sources today, which is how one character showed two faces: play-one-person-shows-two-faces (filed Nov 10) makes one face part; build this item on that part if it has landed, else use `bust` from `src/bench/ui/strips.mjs` (line 38) with the card's own face record. Same screenshot as play-timeline-still-drawn-on-your-life-and-the-person-card (filed Nov 10); the two can ship together but each is its own check. Whole figures stay in rooms and scenes (the people pack on mannequin plates); this item is about menus only. Not verified by the audit: Jobs and study (read in code here: it shares the side figure with Your life).
