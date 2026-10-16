---
id: release-speed-year-runner
title: "Restore a year runner for the speed guard (npm run speed:year)"
area: release
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/release-speed-year-runner
pr: #4647
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T08:03:36.591Z
---

**What.** `npm run speed:year` is gone from package.json: the commit that removed the old engine deleted scripts/speed-years/run.ts, month.ts and year.ts, and the README there still points at run.ts. Restore a runner on the core2 bench world (`buildBenchWorld` and `advanceCore`) with a script entry, and measure the slow aging benchmark the status file mentions.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** `npm run speed:year -- --seed <s> --max-seconds 300` runs a town year in a drawn place and prints the seconds; the README names a command that exists.

**Files.** scripts/speed-years/, package.json

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.
