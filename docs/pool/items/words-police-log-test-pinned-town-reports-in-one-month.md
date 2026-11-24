---
id: words-police-log-test-pinned-town-reports-in-one-month
title: "The police-log usual test's fourth town, Surrency, Georgia, now reports crime in one month only, so it has no usual to compare"
area: words
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
source: "The paper's builder (M3), Nov 15, 2026, carried into the interview check thread at the Account lead's word"
root: none
claimed-at:
branch: claude/project-thread-sew1gc
---

**What.** `src/bench/printed-police-log.test.ts` pinned four drawn places to show the police log's space sliding with the town's usual. The fourth, Surrency, Georgia (seed pl4), was pinned on the premise that it reports crime in more than one closed month; it now reports in one, so the test's "a month was compared" check is red there. Seen: Surrency's paper prints its one police log with no comparison, which is right for a town with no earlier reports.

**Cause.** Measured: Surrency, Georgia (1374852), seed pl4, 330 played days: one report in July and none in any other closed month, so the one wire month has no usual and no vsUsual. First red at train commit f1fd6bcd79 (the fold of #9385, the cabinet change); green at 6044737f (the paper's builder, bisecting).

**Fix.** Keep Surrency as a check of what a town with no earlier reports prints (no month carries vsUsual and no printed log says usual, more than or fewer than), and run the comparison at Hesperia, Michigan (seed pl8), which reports in ten of its first eleven months, 1 to 3 a month. Pin each town by its record id. Drop the two slow places that hold no case of their own (Creve Coeur pl5, River Road pl6; the Account lead's yes), so the file runs in a few minutes.

**Time box.** 2 hours.

**Rules.** No dice: a month is compared with the town's own usual from its record, and a town with no earlier reports is compared with nothing, never a made-up usual.

**Done when.** The test passes at Surrency, Wendell (pl1) and Hesperia (pl8) on the train, and a break of the floor makes Wendell and Hesperia red. A second session plays a drawn place for a year on main, names its seed, and sees in the running game a quiet month's log left out of the paper.

**Waits on.** Nothing.

**Files.** src/bench/printed-police-log.test.ts

**Notes.** Released by next (2026-11-18): no push to claude/project-thread-sew1gc since 2026-11-15 19:13 UTC, more than twice its 2-hour time box. Continue on branch claude/project-thread-sew1gc.
