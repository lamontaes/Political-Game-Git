---
id: law-levels-state-bar-sets-aside-town-law
title: "Law levels: a town's policy law is set aside where its state bars towns (precedence for the single-row laws)"
area: laws
kind: bug
priority: 2
size: M
status: done
claimed-by: law-levels-state-bar
pr: #7311
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-06T02:44:46.234Z
---

**What.** resolveLawInForce lets the most local row win for every policy question, so a town's row stays in force where its state bars towns (docs/reports/law-levels-2026-11-05.md, Part B item 2).

**Rules.** Higher level wins; no dice; a test must not hand-enact a town row where the state bars it and expect it to reach people.

**Done when.** A town's or county's policy row is set aside while the state's preempts flag for that question is true, and the law-reach tests enact where the place may; a drawn-place test shows both outcomes.

**Files.** src/core2/laws-in-force.ts,src/core2/modules/laws.ts,src/core2/law-reach-group-a.test.ts

**Notes.** State Sessions Nov 6 tried it: a statePreempts input read from POLICY_QUESTIONS[series].answers[state].preempts, set into the single branch, passes its own two-case test on a drawn place, but fails 5 audit-13 tests in law-reach-group-a.test.ts (seed 074abe96..., US-ND 3804580: term limits, abortion, photo ID, voting restoration, age verification) because those tests hand-enact the law at the city level in a state that bars towns. Those fixtures must enact at the state first. Not shipped; the work is reverted. Do the fixture change in the same PR.
