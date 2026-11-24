---
id: play-patch-notes-four-scrollbars
title: "The patch notes menu has four nested scrollers and ends short of its panel"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: owner sitting 2026-11-23-1, P1
claimed-at:
after:
lead: play-first
model: sonnet
effort: medium
root: none
---

**What.** The owner, Nov 23: "the patch notes menu is good, except ... why are there 4 scroll wheel bars?" The menu is a list of builds beside the chosen build's notes. The list's box sits inside a second scrolling box, the notes page scrolls too, and the panel ends 80 pixels short of the window with empty area under both. Seen: the patch notes menu at 1440x900 has the panel at the window's full height, the list of builds in one box and the notes in one box, and nothing else scrolls.

**Cause.** Measured: at 1440x900 on the title, in a world drawn at Anawalt, West Virginia, seed 0d87912a-d034-4586-95d8-674f18b6a2ec (a bench build on main 4288a627 stacked on the guards branch) the sheet is 771 of 852 pixels tall. Four overflow-scrolling boxes sit in it: `#sheet-body` (not overflowing), `nav.pick-list.roster`, `div.pager.roster-pages` and `div.roster-page`. `.pick-list` (src/bench/play.css, "Advanced: the officeholders to play as") caps every `nav.pick-list` at 46% of the window with `overflow-y: auto`, and `rosterScreen` (src/bench/ui/roster-screen.mjs) puts the pager's own scrolling box inside that nav: 553 pixels of content in a 414 pixel cap. The sheet opened from the title takes the `options-sheet` class, which sizes it to its content, and `openSheet` (src/bench/play.mjs, the `fits` toggle) adds `patchNotes` to the screens that end under their content, so it ends short of the window.

**Fix.** In src/bench/play.css, scope the nav's cap away for `.roster-screen.patch-notes` (no max-height, overflow visible) so the pager's box is the list's one scroll, give `#game #sheet.options-sheet:has(.roster-screen.patch-notes)` the window's height, and let the notes page run to the panel's foot (`max-height: calc(var(--vh) - 172px)`). `rosterScreen` takes a `maxRows` (default 14) and the patch notes screen asks for 20, so the list shows as many builds as the taller panel holds. Remove the patch notes entries from tests/guards/ui-look-baseline.json.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game, not a spreadsheet: the menu is one list beside its detail with the panel full height, and nothing scrolls while it has free space. Replace, never layer: the nested box is removed, not hidden.

**Done when.** A second session starts the bench on main in a drawn place (named with its seed), opens Patch notes from the title at 1440x900 and sees the panel at full height, the list and the notes each in their own box, no box around the list, and no free space under either; `npm run ui-look` passes with no Patch notes entry in its baseline.

**Waits on.** Nothing.

**Files.** src/bench/play.css, src/bench/ui/roster-screen.mjs, src/bench/ui/strips.mjs, tests/guards/ui-look-baseline.json

**Notes.** Filed by Box and scroll (lane 2) in the PR that builds it, Nov 23. The owner's "one scroll at most" is read as at most one scroll for the list and one for the notes (two boxes); one scroll in total would mean listing only the newest builds that fit, which is the owner's call (asked on #9747).
