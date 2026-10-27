---
id: director-president-asks-within-powers
title: "The President asks Congress only for what Congress can do and is not already law"
area: director
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/director-president-asks-within-powers
pr: #6300
blocked-on:
lead: director
source: CTO opening root-cause report, Oct 27
claimed-at: 2026-10-27T11:03:58.038Z
---

**What.** The President's asks are chosen from their views alone (presidentQuestions, src/director/opening-story.ts:323-338). In Iowa City, Iowa, seed 28c0b8150290, the address said "Congress must remove the duty to retreat before using force." and "States should restrict abortion." Both are state powers only (question-powers.json), and both are already Iowa law (Iowa Code 704.1(3) and 146C.2 in the starting-law records). The owner named this on Oct 27 as hard-coded content. Evidence: docs/reports/opening-root-cause-2026-10-27.md.

**Rules.** Wire to the world: the ask reads policyAuthority (src/core2/policy-authority.ts) and the starting answers in force (src/core2/policy-answers.ts) at the moment it is chosen, and cites both record ids. One rule, all 56 places: a question goes to Congress only when its levels include federal and federal law does not already answer it; to the states only when the player's state's answer differs from the President's stance. No dice.

**Done when.** In a played world (buildBenchWorld) in two drawn places with seeds the builder did not choose, every ask in the address cites the question's powers record and the law-in-force record id it read, no ask of Congress names a state-only question, and no ask names a change the player's state already has; a test beside src/director/opening-story.test.ts fails on the Iowa City seed before the fix.

**Time box.** 3 hours; if not done, push what exists, open the draft PR, write the handoff.

**Files.** src/director/opening-story.ts, src/core2/policy-authority.ts, src/core2/policy-answers.ts

**Notes.** Filed by the CTO root-cause report of Oct 27 (docs/reports/opening-root-cause-2026-10-27.md). Lead: director.

Read Oct 27 by the laws-and-effects lead: one reader of every law in force, `lawHere` (`src/core2/modules/laws.ts`, PR #6289), returns each question's law at every level of the town's chain with its record id, citation and statute, including a county's or city's law and laws passed in play. `lawOn` (`src/director/opening-story.ts:383`) reads only the state's or the nation's row and ignores end dates; reading `lawHere` here gives the ask the law-in-force record id this item's done-when needs.
