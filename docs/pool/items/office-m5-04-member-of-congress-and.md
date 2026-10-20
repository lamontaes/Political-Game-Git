---
id: office-m5-04-member-of-congress-and
title: "M5-04 Member of Congress and president (parallel)"
area: office
kind: feature
priority: 3
size: L
status: claimed
claimed-by: claude/m5-04-verified
pr:
blocked-on:
milestone: M5
source: "docs/roadmap/later-specs-draft.md M5-04"
claimed-at: 2026-10-20T02:22:19.183Z
---

**What.** The same engines at federal level, including foreign policy for the president. Early access doesn't wait for it. (Owner: OPUS-GOV, or anyone free.)

**Rules.** Spec approved by the owner Oct 12; AGENTS.md rules.

**Done when.** A random life reaches Congress or the presidency and governs.

**Files.** see spec

**Notes.** Priority 3 until scheduled. Verify how much is built before starting.

Verified Oct 20 (claude, claude/m5-04-verified). Built and tested on main: the federal office day for a sitting member and a sitting president, played in the bench world in a drawn place (`src/core2/office-day-federal.test.ts` and `office-day-federal-calendar.test.ts`, 2 files, 15 tests pass): the member's weeks follow Congress's calendar, their own bill's vote holds them, a week at home is an abstention, the office is paid; the president's cabinet nominations, the Senate's confirmation votes, the budget request, the joint address, the daily brief, trips and the vice president. In open PRs, not on main: crises for the situation room (#5124), emergency declarations (#5134) and the president's first executive order (#5184). Missing: the way in. No test takes a random life to Congress or the presidency by election (`state-legislator-career.test.ts` does it for a state seat only), so this item's done-when, "a random life reaches Congress or the presidency and governs", is not met. Suggested split: (1) a Congress career test like the state one, filing for the town's U.S. House seat against its holder; (2) a presidency path, which the owner's early-access line says need not wait; (3) pardons and foreign policy, still stopgaps.
