---
id: release-speed-year-runner
title: "Restore a year runner for the speed guard (npm run speed:year)"
area: release
kind: bug
priority: 2
size: S
status: done
claimed-by:
pr: #4647
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** `npm run speed:year` is gone from package.json: the commit that removed the old engine deleted scripts/speed-years/run.ts, month.ts and year.ts, and the README there still points at run.ts. Restore a runner on the core2 bench world (`buildBenchWorld` and `advanceCore`) with a script entry, and measure the slow aging benchmark the status file mentions. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** `npm run speed:year -- --seed <s> --max-seconds 300` runs a town year in a drawn place and prints the seconds; the README names a command that exists.

**Files.** scripts/speed-years/, package.json

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/archive/2026-10-23/coordination/gov.md), checked against main on Oct 16, 2026.

Sent back 2026-10-16 from PR #4647 (branch claude/release-speed-year-runner): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
