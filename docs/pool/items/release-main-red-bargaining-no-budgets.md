---
id: release-main-red-bargaining-no-budgets
title: "Main is red: the public bargaining handler throws where no budgets engine is open"
area: laws
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/laws-bargaining-without-budgets
pr: #6624
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T14:40:52.363Z
---

**What.** Since the public bargaining law reach merged, src/core2/law-reach/group-a-bargaining.ts asks the budgets module for its governments the moment the law takes effect. A world opened without the budgets engine, such as the fixture worlds of src/core2/world-legislating.test.ts, throws 'Module has no registered state' from module-state.ts:205 and the unit job is red on main. Every sibling handler (staffing, money) checks that the budgets module is open before reading its tables; the bargaining handler is the one that does not.

**Rules.** Red main comes first (owner, Oct 15): fix it at the root on its own PR before any item. One engine per mechanic: the handler reads the budgets engine's module id, it never keeps its own list of governments. Never weaken a test to get green.

**Done when.** src/core2/world-legislating.test.ts passes all six tests on main with the fix, including the council-and-county-board test that threw, and src/core2/law-reach-bargaining.test.ts still passes in its drawn place with its seed named; typecheck, eslint and prettier pass on the changed file.

**Files.** src/core2/law-reach/group-a-bargaining.ts,src/core2/world-legislating.test.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6624 merged (the done flip failed while branch protection refused the flip job's push).
