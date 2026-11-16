---
id: screens-panel-approved-texture
title: "Every menu wears the approved textured panel, not the flat block"
area: play
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: screens lane (Nov 16)
pr: 9748
blocked-on:
source: owner, Nov 16, crew line item 4a
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** The owner played 0.112.0 on Nov 16 and called the menus blocky. His words were "I hate this blockiness", said of the Politics screen. Every menu sat on a flat dark block with a drawn brass line, an iron ring and four corner pictures, not the textured panel he approved on Nov 5.
Seen: the Politics screen of a new life beside its approved mock.

**Cause.** Found in code: `src/bench/play.css` line 475, the `.panel` rule, drew a two-color gradient (`--glass-top`, `--glass-bottom`) with `border: 2.5px solid var(--brass)` and corner pictures in `.panel::before` and `.panel::after`; the approved picture `docs/mocks/2026-11-07-approved/img/panel.png` was never served by `src/bench/server.ts`.

**Fix.** Change the `.panel` rule in `src/bench/play.css` to draw the approved picture as its frame and fill, with the darker tint under the text, and serve the picture from `src/bench/server.ts`. Hover on rows and buttons reads one halo. The player sees it on every menu, note and card.

**Time box.** 2 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the flat glass, the drawn brass line and the corner pictures are deleted in the same change. One rule, all 56 places: the panel is one rule every screen reads in every place.

**Done when.** A second session opens every rail screen of a new life in a drawn place, Afono, American Samoa (seed 9a65400c-3f3d-4684-a1ff-417391fc98ed) or another, and sees the textured panel with its slim brass edge on each, and a hovered row shows the halo.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/server.ts, public/ui/kit13/panel.png, tests/guards/panel-look.test.ts

**Notes.** Crew line #9747, item 4a.
