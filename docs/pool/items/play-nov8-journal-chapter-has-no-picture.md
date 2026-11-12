---
id: play-nov8-journal-chapter-has-no-picture
title: "A journal chapter is words only: the approved journal has a picture for the chapter and the game draws none (owner's Nov 8 playtest, Manchester, Connecticut)"
area: play
kind: bug
priority: 2
size: S
status: merged
claimed-by: claude/pool-play-nov8-journal-chapter-has-no-picture
pr: #8468
after:
blocked-on:
standard: 2
model: sonnet
effort: medium
root: design-life-record
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6: the 72 points of the Nov 8 playtest, point P35, not fixed)
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:13:41.607Z
branch: claude/pool-play-nov8-journal-chapter-has-no-picture
merged-at: 2026-11-11T15:02:24.618Z
---

**What.** The owner, Nov 8, about 2:20 p.m. (v0.94.0, Manchester, Connecticut): "I go to journal. Again, it's just words. There's no illustration. There's no UI elements." The conditionally approved journal mock has a picture for the chapter and the game draws none. A journal line keeps the ids of the moments it tells, but a scene already played cannot be fetched again to get its backdrop (checked at Fort Wingate, New Mexico, seed dd6bca35-d61e-40b7-876c-008c3460e712: 1 chapter, 3 lines, 7 moment ids, none returns a scene). When the journal writes a line from a scene it should keep that scene's place on the line's record, and a chapter should show the picture of the place its lead line happened in; a chapter with no place on record shows no picture slot at all.

**Cause.** Found in code: `journalScreen` in src/bench/ui/strips.mjs (line 423) draws the chapters and the chosen chapter's paragraphs only, and src/director/journal.ts keeps no scene place on a line, so there is nothing to ask for a backdrop. Measured at Fort Wingate, New Mexico, seed dd6bca35-d61e-40b7-876c-008c3460e712 (Nov 9, by the Screens row note).

**Fix.** Write the place of the scene onto the journal line's record when the line is written (src/director/journal.ts), have the bench hand a chapter the backdrop of its lead line's place (src/bench/backdrop-places.ts), and draw that picture in `journalScreen` with no caption. A chapter with no place on record gets no picture slot. No new art is admitted: reuse the backdrops scenes already draw.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the chapter's picture is read from the place kept on the line when it was written, never chosen by the screen from a stock list. No hand-written player text: the picture carries no caption and nothing is typed under it. Owner, Oct 14 (OWNER-DECISIONS): "The journal is a dramatized story, not a list of facts."

**Done when.** A second session (not the builder) starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named), plays until at least two scenes have written journal lines, opens Journal and takes a screenshot at 1440x900 of each chapter. A chapter whose lead line came from a scene shows the picture of the place that scene happened in, and the proof names the journal line's record id, the place it kept and the picture's file. A chapter of the life before the game began shows a picture only when its records name a place that has one, and otherwise no empty frame. No picture carries a caption and the page has no bare half. The check is repeated in Manchester, Connecticut, the owner's place on Nov 8 (no seed was kept), as the named repro.

**Waits on.** Nothing.

**Files.** src/bench/ui/strips.mjs, src/director/journal.ts, src/bench/play.mjs, src/bench/handler.ts, src/bench/backdrop-places.ts

**Notes.** From the Nov 8 playtest, point P35 (docs/coordination/playtest/2026-11-08-1.md), its row in `2026-11-08-1-check.md` (Check D: "Copied the mock's columns, not its picture or prose") and the Nov 9 Screens row note quoted above, which ends: "A chapter would need to record the backdrop of the scene it tells; that is a new link, left for a later pass. A chapter with no scene gets no picture slot, the same rule as `storyPhoto`." This item is that later pass. The two sibling points are handled on main: a chapter is one column with no drop cap unless its words fill two (`JOURNAL_TWO_COLUMNS` and `JOURNAL_DROP_CAP` in `strips.mjs`; points C32 and C33). Related, filed Nov 10: play-journal-says-one-thing-three-times, play-nov8-journal-says-he-moved-to-where-he-was-born. Related done item on the older look: play-menus-journal-shared-look. Any new picture goes through `.agents/skills/asset-scene-admission/SKILL.md`; this item should need none, since it reuses the backdrops scenes already draw. Not verified: nothing here was measured in the running game on Nov 10 beyond the row note's own check.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:07 UTC) on branch claude/pool-play-nov8-journal-chapter-has-no-picture.

Released (2026-11-11): Tried a bench-side cache of each played scene's backdrop by moment id, read by /api/journal per chapter: in 4 drawn places (Wylandville PA, Little Browning MT, Venango PA, Fananganan MP) the journal's lines carry 7 to 14 moment ids but no chapter got a picture, because those moments (opening, life history) were never fetched through /api/story. The fix has to be as the item says, in src/director/journal.ts: write a place onto the line from its own source records (records carry placeId; map that to a backdrop via src/bench/backdrop-places.ts / scene.ts backdropFor, which takes a 'pictured' key, not a place id, so that mapping is the open question). Nothing pushed. Continue on branch claude/pool-play-nov8-journal-chapter-has-no-picture.

Claimed by next for sonnet-fd29 (Claude Sonnet 5.5 in Claude Code (cloud), tier mid) (2026-11-11 02:13 UTC) on branch claude/pool-play-nov8-journal-chapter-has-no-picture.
