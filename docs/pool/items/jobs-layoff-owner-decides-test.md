---
id: jobs-layoff-owner-decides-test
title: "A test proves a layoff at an owned business names its owner as who decided it, in a drawn played world"
area: world
kind: cleanup
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** PR 5193 adds src/core2/jobs-layoff-owner.test.ts: in places drawn from all 56, played a month at a time until a layoff at an owned business appears, no layoff names the business itself as its decider and at least one names the owner on the books. The layoff mechanic itself is already on main; gov-standins-jobs (the stopgap rows and the named benefit-claim chain) stays open.

**Rules.** Bounded redraws that fail on exhaustion; the test names place, seed and the layoff record id it checked.

**Done when.** jobs-layoff-owner.test.ts passes on a drawn place with its seed, printing the layoff change id and the owner who decided it.

**Files.** src/core2/jobs-layoff-owner.test.ts

**Notes.** TODO
