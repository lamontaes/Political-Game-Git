---
id: play-your-life-draws-a-full-body-figure
title: "Your life and Jobs and study draw the player as a full-body figure, where the owner ruled busts only (seen in Blodgett Landing, New Hampshire)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-play-your-life-draws-a-full-body-figure
pr: #8608
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Against your newest rulings (measured)")
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:10:40.298Z
---

**What.** The audit measured on Nov 9 in Blodgett Landing, New Hampshire (a random world, no seed given): "Your life shows a full-body figure." The You tab uses the approved strip screen with a bust, while the other two tabs of the group keep a side figure of a seated woman drawn head to shoes in a tall frame. The owner ruled on Nov 7 that menus show busts only. No menu should draw a full figure: Jobs and study and Your life show the same bust the You tab shows, from the same face record, and the full-figure slot, its picture source and its styles are deleted.

**Cause.** Found in code: `openSheet` in src/bench/play.mjs (about lines 5245 to 5259) keeps "the side figure" for two tabs, calling `fillArtwork` (src/bench/ui/picture.mjs, line 12) with `portraitUrl()` (src/bench/play.mjs, line 3167) into `#sheet-media` under the class `character-sheet`.

**Fix.** Show the same bust the You tab shows on all three tabs from the same face record (use the one face part if play-one-person-shows-two-faces has landed, else `bust` in src/bench/ui/strips.mjs, line 38, with the card's own face record), and delete `fillArtwork`'s figure, `portraitUrl`, the `#sheet-media` slot and the `character-sheet` and `screen-portrait` styles. Whole figures stay in rooms and scenes.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: `fillArtwork`'s figure, `portraitUrl`, the `#sheet-media` slot and the `character-sheet` and `screen-portrait` styles go in the same change that puts the bust on these tabs. Owner, Nov 7 (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 50): "we're going to keep the busts because that's easiest to do ... The full body, we keep coming with problems with that." This is about menus only.

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named), opens You and takes a screenshot at 1440x900 of each of its three tabs: all three show the same bust, head to upper chest ending in a soft fade, of the same face, and none shows legs, a whole seated or standing figure, or a tall framed picture beside the text. The session then opens every other menu from the rail and confirms none draws a whole figure. The same three screenshots are taken in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro, and set beside the approved example `you-ol-g` in docs/mocks/2026-11-07-approved/menu-examples.html.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/ui/picture.mjs, src/bench/ui/strips.mjs, src/bench/play.css, src/bench/play.html

**Notes.** From the audit's Pillar 6 and its "Reported done" item 8 ("the withdrawn timeline and full figures remain"). The creator also draws two full-length figures; that is play-new-game-and-creator-open-without-busts (filed Nov 10). The figure and the bust come from different sources today, which is how one character showed two faces: play-one-person-shows-two-faces (filed Nov 10) makes one face part; build this item on that part if it has landed, else use `bust` from `src/bench/ui/strips.mjs` (line 38) with the card's own face record. Same screenshot as play-timeline-still-drawn-on-your-life-and-the-person-card (filed Nov 10); the two can ship together but each is its own check. Whole figures stay in rooms and scenes (the people pack on mannequin plates); this item is about menus only. Not verified by the audit: Jobs and study (read in code here: it shares the side figure with Your life).
