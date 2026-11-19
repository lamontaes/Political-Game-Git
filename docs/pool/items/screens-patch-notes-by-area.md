---
id: screens-patch-notes-by-area
title: "Patch notes read by area, one short line each, with nothing that scrolls"
area: play
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: screens lane (Nov 16)
pr: 9775
blocked-on:
source: owner, Nov 16, crew line item 4b
after:
lead: play-first
model: opus
effort: medium
root: none
---

**What.** The title's Patch notes showed each change as a paragraph, grouped only by Added, Improved, Fixed and Changed, in a narrow box that scrolled. Build 0.112.0 ran to 87 paragraphs. The owner said "This is not structured like a real patch note."
Seen: Patch notes on the title, where 0.112.0 needs many screens of scrolling.

**Cause.** Found in code: `scripts/release/notes.ts` line 155, `renderReleaseSection`, wrote every note as its title and its whole body under its kind of change; the title's sheet opened Patch notes in the compact centered panel, and `patchNotesScreen` in `src/bench/ui/strips.mjs` drew each note as a paragraph.

**Fix.** Give declarations an optional `area` in `scripts/release/declarations.ts`, and have `renderReleaseSection` list a note filed under an area as its title alone; draw `patchNotesScreen` as one-line notes flowing in columns across a full-width sheet. Rewrite 0.112.0 by area, one short line each. The player sees it on the title's Patch notes.

**Time box.** 3 hours for one session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the paragraph notes on the screen and the compact panel for Patch notes go in the same change. No hand-written player text in code: the notes are the release file's own lines, written as declarations are.

**Done when.** A second session opens Patch notes from the title and reads 0.112.0 grouped by area, every note on one line, nothing scrolling, in a drawn place or on the title before any game.

**Waits on.** Nothing.

**Files.** scripts/release/model.ts, scripts/release/declarations.ts, scripts/release/notes.ts, tests/release/note-areas.test.ts, PATCH_NOTES.md, src/bench/ui/strips.mjs, src/bench/play.mjs, src/bench/play.css, src/bench/patch-notes-fit.browser.mjs

**Notes.** Crew line #9747, item 4b. Rewriting the accepted 0.112.0 section is its own commit, for the CTO to keep or drop.
