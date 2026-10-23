---
id: web-gov-measures-read
title: "The outcome web reads the government measures"
area: world
kind: wiring
priority: 3
size: S
status: done
claimed-by:
pr: #4709
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `govMeasure(api, measure)` (gov-measures.ts, ten measures) is called only by its test. Have the engine-measure branch of outcome-web.ts (`readEngine`) call it for any measure in `GOV_MEASURES`.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place an outcome moved by a government measure cites that measure's value and record id, not a world-metrics month.

**Files.** src/core2/modules/outcome-web.ts, src/core2/gov-measures.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/gov.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4709 (branch claude/web-gov-measures): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4709 (branch claude/web-gov-measures): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.
