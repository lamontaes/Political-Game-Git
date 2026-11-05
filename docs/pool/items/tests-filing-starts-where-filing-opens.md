---
id: tests-filing-starts-where-filing-opens
title: "Filing tests start on the day a contest opens in the drawn place"
area: elections
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Golden-path filing specs failed with no open contest to file for in places whose filing window opens after Jan 5 (38 of 56 jurisdictions). The specs now wait for the first open day, and the deadline check follows the one-deadline rule.

**Rules.** One rule, all 56 places: the place's own calendar says when filing opens. No test loosened.

**Done when.** elections-filing, campaigns pass in James Town WY, Ewa Villages HI and nine more drawn places; families guard green

**Files.** src/core2/gov-test-clock.ts, src/core2/campaigns.test.ts, src/core2/elections-filing.test.ts, tests/guards/families-baseline.json

**Notes.** TODO
