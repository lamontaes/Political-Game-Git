---
id: tests-office-day-federal-president-never-held
title: "office-day-federal.test fails four cases on main: the president is never held for nominations and sets no budget request"
area: gov
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/federal-day-president-held
pr: #6709
blocked-on:
lead: red-main
source: wire-office session, Oct 28 (found red on main)
claimed-at: 2026-10-28T21:46:13.631Z
---

**What.** `src/core2/office-day-federal.test.ts` fails four of eleven cases on clean main at da7f383272 with OFFICE_FEDERAL_SEED=a1b2c3d4 (Oxford, Kansas) and on random seeds. The nominations stop never holds the president (line 172, held is false), the budget request's priorities are set by no one (line 202, setBy undefined against the president's term), switching to the sitting member throws "A held deadline is still open for this character" (line 281), and the player's own bill vote counts nothing. The same four fail before and after #6631 merged, so the cause is older than the legislature body rows.

**Rules.** One engine per mechanic: the federal executive's day runs through the executive and office-day engines that already exist, and the fix restores their read rather than adding a second path. No dice: the president acts from their records and the calendar, never a roll. One rule, all 56 places: the test draws its place, and the fix names no state.

**Done when.** `src/core2/office-day-federal.test.ts` passes 11 of 11 with OFFICE_FEDERAL_SEED=a1b2c3d4 and on ten more drawn seeds, and the PR body names, by record id in that played world, the cabinet post the president nominates for and the budget priorities record they set, with the commit that broke them.

**Time box.** 3 hours; if not done, push what exists, open the draft PR and write the handoff in Notes.

**Files.** src/core2/office-day-federal.test.ts, src/core2/office-day-federal.ts, src/core2/office-day-federal-president.ts, src/core2/modules/executive.ts

**Notes.** Found by the wire-office session while testing row 45; checked at b23a0c889a^1 and b23a0c889a (both 4 failed, 7 passed).

Oct 29 (CTO): set done; PR #6709 merged (the done flip failed while branch protection refused the flip job's push).
