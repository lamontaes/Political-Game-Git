---
id: roadmap-m1-flip-proven-three
title: "Roadmap M1-01 and M1-02 read passes: true, with their runs and bench screenshots"
area: core
kind: feature
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr: #5875
blocked-on:
source: added with npm run pool -- add
claimed-at:
after:
lead: m0-m2
model: opus
effort: high
root: none
checked: fable 2026-11-10
---

**What.** M1-01 (laws in force) already reads passes true in docs/roadmap/features.json, so only M1-02 (the national economy and central bank) is left of the two flags this item was filed for. The Notes record that M1-02's registered command gave zero bank lines and zero repricings in an independent draw at Swanton, Nebraska, byte-identical on clean main, and that the newly accepted flag lacks its positive loan-cost witness. Nobody has traced why the draw shows no repricing. The item stays open until a rate decision is seen changing what loans cost in a drawn place, and M1-02 then flips with its run named.

**Cause.** Needs cause. Looked at docs/roadmap/features.json (M1-01 true, M1-02 false) and src/core2/tooling/m1-02-check.ts, which exists; the zero-repricing result in the Swanton, Nebraska draw is reported in the Notes but not traced to a record or a line.

**Fix.** None until the cause is found.

**Time box.** 4 hours to find why a drawn place shows no bank lines or repricings.

**Rules.** Wire to the world: the flag flips only on its command passing in a place drawn from all 56 with the spec played in the bench. Never edit a spec's test text; only passes changes. Ask why: name by record why the draw shows no repricing before changing the check.

**Done when.** A second session runs the M1-02 command in the Swanton, Nebraska draw and in two more drawn places and sees a rate decision change what a loan costs in the town, by the bank line and repricing record ids, with the place and full seed printed. docs/roadmap/features.json then reads passes true for M1-02, with no spec text changed and the run named in the PR body.

**Waits on.** Nothing.

**Files.** docs/roadmap/features.json, src/core2/tooling/m1-02-check.ts

**Notes.** Split by the M0-M2 lead from roadmap-m1-laws-budgets-flags, roadmap-m1-economy-flags and roadmap-m1-people-politics-flags (CTO branch).

Sent back 2026-10-24 from PR #5875 (branch claude/quirky-ride-vrwwz4-m1-flags): M1-10 true lacks ordinary played-year event-to-view evidence; cited views-only fixture and opening Moderate screenshot do not prove the accepted event-effect spec; finish on that branch, merge main into it first.

Rescoped Oct 24 by the M0-M2 lead after the merger's send-back on #5875: M1-10 leaves this item, because its test injects a fixture event into a views-only world; its played-world proof is roadmap-m1-10-views-played-world.

Sent back 2026-10-24 from PR #5875 (branch claude/quirky-ride-vrwwz4-m1-flags): Registered M1-02 command fails in independent Swanton NE draw with zero bank lines/repricings, byte-identical on clean main; newly accepted flag lacks its positive loan-cost witness; finish on that branch, merge main into it first.

Sent back 2026-10-24 from PR #5875 (branch claude/quirky-ride-vrwwz4-m1-flags): Routed item still requires M1-01 and M1-02 while body withdraws M1-02; additionally unreported campaign runtime changes need their own accurate scope and acceptance evidence; finish on that branch, merge main into it first.

M1-01 alone is bounded by roadmap-m1-flip-proven-one for PR #5875. This two-flag item stays open until M1-02 has its loan-cost witness in a drawn place; no feature test text was changed.

Look-first audit 2026-10-27 (docs/reports/retroactive-look-first-2026-10-27.md): correct the item: flip the flag on the test result, drop the per-spec screenshot; narrow to M1-02.
