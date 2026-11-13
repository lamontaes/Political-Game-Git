---
id: wire-law-links-to-people-part-1-partly-wired-laws
title: "Partly-wired laws reach a named person or carry a stopgap"
area: laws
kind: wiring
priority: 1
size: M
status: merged
standard: 2
claimed-by: claude/pool-wire-law-links-to-people-part-1-partly-wired-laws
pr: #8523
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: split from wire-law-links-to-people in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T08:05:05.798Z
branch: claude/pool-wire-law-links-to-people-part-1-partly-wired-laws
merged-at: 2026-11-13T01:41:15.739Z
---

**What.** Part of wire-law-links-to-people. The law matrix grades 31 laws as partly wired: the law is in force but not every engine that should read it does. Make each one reach a named person's money or view, proven in a drawn place, or carry a specific registered stopgap that names the engine still missing. Regenerate the matrix with each change. Seen: a named person's money or view moving after one of 31 partly wired laws.

**Cause.** Found in code: docs/reports/law-wiring-matrix.json summary (built by scripts/law-wiring/matrix.ts) lists 31 of 178 laws as partly wired; per-law reach lives in src/core2/law-reach/applied.ts (`applied.ts`).

**Fix.** Work the partly-wired rows one PR per law, oldest stopgap first: make the engine that pays or decides read the law in force, prove it with scripts/law-wiring/check.ts in two drawn places, regenerate the matrix, and delete the second path.

**Time box.** 8 hours for one Opus session; stop at the time box with the matrix regenerated and the count of laws done in the PR body.

**Rules.** Replace, never layer: every PR deletes the second path and counts it. Wire to the world and an effect is a read, not a record: the law in force changes, the engine that pays or decides reads it, and a named person's money or view moves. The chain is the acceptance. A missing reader is a registered stopgap naming the engine, not a new mechanic.

**Done when.** A second session sees, for each law the part moved, the chain in two drawn places (places and seeds named): the law in force, the payment or decision that read it, and the named person whose money or view moved, by record id; the regenerated docs/reports/law-wiring-matrix.json shows the partly count down by the PRs' count, and the 31 each reach a named person or carry a specific stopgap.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/applied.ts, scripts/law-wiring/matrix.ts, scripts/law-wiring/check.ts, docs/reports/law-wiring-matrix.json

**Notes.** Claimed by next for opus-5251 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:29 UTC) on branch claude/pool-wire-law-links-to-people-part-1-partly-wired-laws.

Released (2026-11-11): opus-5251 stopped under the cap on new work (Nov 11); the draft PR and its branch keep the work and a handoff note; claiming it takes the branch. Continue on branch claude/pool-wire-law-links-to-people-part-1-partly-wired-laws and pull request #8523.

Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 08:05 UTC) on branch claude/pool-wire-law-links-to-people-part-1-partly-wired-laws.
