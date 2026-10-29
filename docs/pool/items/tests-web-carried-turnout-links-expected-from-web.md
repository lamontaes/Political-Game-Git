---
id: tests-web-carried-turnout-links-expected-from-web
title: "Two law tests still expect the outcome web to run the turnout links the law reach now carries"
area: laws
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/laws-web-test-carried-turnout
pr: #6634
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T15:46:28.557Z
---

**What.** Since #6573 the all-mail and same-day registration turnout links are carried by the law reach's turnout relief (electionLawTurnoutCost in src/core2/law-reach/group-a-voting.ts), so the outcome web no longer runs them. src/core2/outcome-web.test.ts still expects same-day-registration-to-youth-turnout to move its outcome by the researched size and fails on clean main (seed 35a646d0f0fcafda466bf20b15ece275, Cruz Bay, U.S. Virgin Islands: expected undefined to be close to 0.13). src/core2/law-wiring-government.test.ts expects both links to fire in a place where the law began as no.

**Rules.** Red main comes first (owner, Oct 15): fix it at the root on its own PR. Never weaken a test to get green: the test asserts the carried links stay out of the web, the way the groundwater and farmland carried links are asserted, rather than dropping the check.

**Done when.** src/core2/outcome-web.test.ts passes on seed 35a646d0f0fcafda466bf20b15ece275 and a fresh drawn place, and src/core2/law-wiring-government.test.ts passes in its played world, each asserting that the web leaves the carried turnout links alone; typecheck, eslint and prettier pass on both files.

**Files.** src/core2/outcome-web.test.ts,src/core2/law-wiring-government.test.ts

**Notes.** TODO

Oct 29 (CTO): set done; PR #6634 merged (the done flip failed while branch protection refused the flip job's push).
