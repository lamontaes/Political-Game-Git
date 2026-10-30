---
id: play-menus-patch-notes-cards
title: "Patch notes shows one release at a time: its changes as headline cards on a plate, the chosen change in full beside them"
area: play
lead: cto
kind: bug
priority: 1
size: S
status: in-pr
claimed-by: cto/menus-patch-notes
pr: #6900
blocked-on:
milestone: play-first
source: owner, Oct 29 ("So they're not blocks of text anymore with random buttons"; menus never scroll as a page)
claimed-at: 2026-10-30T03:45:47.433Z
---

**What.** Patch notes prints all 164 releases as plates of paragraphs down one panel, and the panel scrolls about 360,000 pixels. Each change's bold headline is fused into its text ("Nobody writes on their own lap People drawn writing..."), because the parser drops the bold marks. This item shows one release at a time, chosen from a list of releases, newest first: its changes as headline cards on a plate, paged, and the chosen change's full text beside them with its group (Added, Improved, Fixed). The parser keeps each bullet's bold lead as the change's headline.

**Rules.** Screen to mock: the Guide's encyclopedia layout and the shared kit parts (plate, pager, list entry, split screen, select, chips), never a one-off renderer. No hand-written player text: every headline and sentence comes from `PATCH_NOTES.md` through the release machinery, every label from the controls words. Replace, never layer: the column of release plates is deleted. Prior ruling: Sept 8 PATCHNOTES-VERSION1 ("It opens human-readable notes"), Oct 28 sitting point 1 (one release a page, newest first, nothing unreleased).

**Done when.** At 1440 by 900 the title-patch-notes browser check opens Patch notes, finds the newest release chosen with at least one headline card, opens a card and reads its full text beside the cards, chooses an older release and sees its cards, and fails if the sheet body scrolls; screenshots land in `docs/play-first/shots/play-menus-patch-notes-cards/`.

**Time box.** 1 hour, Opus (CTO).

**You will see.** Patch notes as a release picker, that release's changes as cards, and the change you click in full beside them.

**Screenshot.** Patch notes before and after at 1440 by 900.

**Files.** src/bench/patch-notes.ts, src/bench/patch-notes.test.ts, src/bench/play.mjs, src/bench/play.css, src/bench/data/controls.json, src/bench/title-patch-notes.browser.mjs

**Notes.** Filed by the CTO, Oct 30 04:00, the tenth screen of the menu redesign (Options already sits on one plate with no text block and is left as it is). Read: prior-rulings/screens.md items 22 and conflict 11; OWNER-DECISIONS Oct 29 22:45 and the Oct 28 subtitle ruling; searched the pool: patch notes (play-stop-13, screens-title-continue-name-only and the release items are other subjects; no twin).
