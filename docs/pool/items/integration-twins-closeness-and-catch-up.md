---
id: integration-twins-closeness-and-catch-up
title: "One closeness reader and one day loop: the justice engine's raw tie level and the uncalled catchUpLife are deleted"
area: core
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/integration-one-closeness-reader
pr: #6462
blocked-on:
source: "Duplicates session (owner, Oct 28), handed to the integrator: rows inside the integrator's facts (ties, the clock)"
lead: director
milestone: play-first
claimed-at: 2026-10-28T00:45:00.000Z
---

**What.** The justice engine weighs a witness's tie to the accused with its own closeness function, which returns the raw relationship level with no fading since the last contact, while every other reader of a tie uses closenessBetween (src/core2/closeness.ts), which fades it. And src/core2/life.ts keeps catchUpLife, a second day loop beside advanceCore and the player clock's closeDay, which nothing in play calls. This item deletes both twins, so a tie reads the same everywhere and a day is lived by one loop.

**Rules.** Replace, never layer: the second closeness reader and the uncalled day loop are deleted in this change, not kept beside the ones every engine reads (owner, Oct 27, 4 PM Eastern: one source per fact).

**Done when.** The justice engine's local closeness is deleted and its one reader calls closenessBetween; catchUpLife and its now-unused imports are deleted; typecheck, eslint and the justice tests pass, with any failure shown red on clean main with the same seed.

**Time box.** 2 hours; if not done, push what exists, open the draft PR, write the handoff.

**You will see.** Nothing on screen; a witness who has drifted from the accused weighs that tie as the rest of the game does.

**Screenshot.** None: no screen changes.

**Files.** src/core2/modules/justice.ts, src/core2/life.ts

**Notes.** From docs/reports/duplicates-on-main-2026-10-28.md (PR #6455). Read: OWNER-DECISIONS (Oct 27, afternoon), LAW.
