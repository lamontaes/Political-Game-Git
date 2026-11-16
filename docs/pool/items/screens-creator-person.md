---
id: screens-creator-person
title: "The creator shows nobody before a gender, has one Random, and shows hair as pictures"
area: play
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by: screens lane (Nov 16)
pr:
blocked-on:
source: owner, Nov 16, crew line item 4e and his Desk answer on the creator
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** The creator drew a bust before any gender was chosen, and it had four separate random buttons. Hair and colors were rows of arrows with words. The owner said "a person shouldn't even pop up until I pick a gender" and asked for one Random for the whole person.
Seen: Start a life on main, where a bust stands in the first frame with no gender chosen.

**Cause.** Found in code: `src/bench/play.mjs` line 7093, in `openCreator`, called `openLook()` before a gender was set; `appearanceRows` in `src/bench/appearance.ts` gave every row a word and arrows only.

**Fix.** Change `openCreator` in `src/bench/play.mjs` to show no bust and no How I look until a gender is chosen, make `#cr-randomize` draw a name, a birthday, a place and a look, and give `appearanceRows` swatches read from the paintings and pictures of the look wearing each hairstyle. The player sees it on Start a life.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the three separate random buttons and their two checks are deleted in the same change. One rule, all 56 places: Random draws its place from all 56, as Random place did.

**Done when.** A second session opens Start a life in a drawn place and sees no bust before a gender; after one, sees hair and facial hair as pictures and skin and colors as swatches, and one Random fills the name, birthday, place and look; no column is left empty.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/play.css, src/bench/play.html, src/bench/ui/look-row.mjs, src/bench/appearance.ts, src/bench/bust.ts, src/bench/handler.ts, src/bench/creator-person.browser.mjs

**Notes.** Crew line #9747, item 4e.
