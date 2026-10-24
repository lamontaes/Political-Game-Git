---
id: laws-end-to-end-screenshots
title: "Screenshots of the laws end-to-end proof's scene and journal line, once their wording is graded"
area: laws
kind: wiring
priority: 2
size: S
status: blocked
claimed-by:
pr:
blocked-on: owner grading of nine wording pieces (journal.law-effect-learned.* and the scene openings named in laws-end-to-end-proof's PR)
source: added with npm run pool -- add
---

**What.** The laws end-to-end proof follows a law the player passes to a resident who ties a bill to it, and composes that resident's director scene and journal line from records. Play shows neither yet, because the nine pieces of wording they use are authored and `shippable: false` until the owner grades them. The proof's last done-when line, screenshots of the scene and the journal, moved here from `laws-end-to-end-proof` so the rest of the proof can merge.

**Rules.** No hand-written player text: the scene and journal words come from the English engine's graded bank pieces, never from text typed into a screen for the screenshot.

**Done when.** Once the nine pieces are graded shippable, the proof's pinned seed (4a4e3819bc34b9d1e26d8413, Susupe, Northern Mariana Islands) is played on the bench in a real browser, and screenshots of the resident's law-takes-effect scene and of the journal line naming the bottle deposit, with their record ids, go in the PR body.

**Files.** src/core2/laws-end-to-end.test.ts, data/english/parts/journal.json, data/english/parts/scene-words.json

**Notes.** From the laws lead, Oct 24: split from `laws-end-to-end-proof` because the screenshots wait on the owner's grading.
