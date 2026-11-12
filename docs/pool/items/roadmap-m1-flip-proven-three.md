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
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
branch: claude/pool-roadmap-m1-flip-proven-three
---

**What.** M1-01 (laws in force) already reads passes true in docs/roadmap/features.json, so only M1-02 (the national economy and central bank) is left. Its check now draws past a town with no bank, and it passed on Nov 10 in one place. Run it in two more drawn places on main and flip M1-02 to passes true with the runs named. Seen: a rate decision changes what a loan costs in the town, read on the bank's business line in dev mode.

**Cause.** Found in code: src/core2/tooling/m1-02-check.ts (header, lines 13 to 16): the loan-cost clause needs a town with a bank line open at a rate change, and Swanton, Nebraska has no bank, which is why the Oct 24 draw showed zero bank lines and zero repricings. The check now draws further places from all 56 until one has a bank line, and reports every place it tried. Measured by Fable on Nov 10: `GOLDEN_PATH_SEED=m102fable1 GOLDEN_PATH_PLACE_KEY=3148060 node --max-old-space-size=8192 --import tsx src/core2/tooling/m1-02-check.ts` passed with 9 rate changes, 1 bank line in the town and 8 repricings on decision days (run on PR #8246's branch, because main could not load the command that hour). No cause is left to find.

**Fix.** On current main, run the M1-02 command from docs/roadmap/features.json with `GOLDEN_PATH_PLACE_KEY=3148060` and Fable's seed, then with two seeds nobody chose, each with the place key `drawPlace` gives for it (scripts/core2-year/place.ts). If all three pass, set M1-02's `passes` to true in docs/roadmap/features.json and change nothing else in the row. Put each run's place, full seed, rate change count, bank line id and repricing record ids in the PR body. If main cannot load the command, or a run fails, stop and write the first stack frame or the failing clause into the Notes. Clause 1 (the real bands) is printed, not tested, by the owner's Nov 8 ruling; say so in the PR body and do not edit the spec's test text.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

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

**Notes (Fable, Nov 10, rerun).** The reason for the empty result is already written in the check's own header: Swanton, Nebraska has no bank, and the check now draws further places until a town has a bank line open at a rate change. Run on Nov 10 with `GOLDEN_PATH_SEED=m102fable1 GOLDEN_PATH_PLACE_KEY=3148060 node --max-old-space-size=8192 --import tsx src/core2/tooling/m1-02-check.ts` on the branch of pull request 8246 (main itself could not load the command that hour): it passed, with 9 rate changes, 1 bank line in the town and 8 repricings on the day of a decision. What is left is this item's own finish line: a second session runs it in two more drawn places and the flag is flipped with the runs named. No cause is left to find.

Cause found (Nov 11, 2026, cause finder for Fable B): confirmed Fable's Nov 10 note against the check's code on main. The empty Swanton result is the check's own documented case, and the check already draws further places. Only the finish line is left, so the item is rewritten for a Sonnet run of three places and the flag flip.

Claimed by next for sonnet-2698 (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 06:31 UTC) on branch claude/pool-roadmap-m1-flip-proven-three.

Released by next (2026-11-11): no push to claude/pool-roadmap-m1-flip-proven-three since 2026-11-11 08:07 UTC, more than twice its 1-hour time box. Continue on branch claude/pool-roadmap-m1-flip-proven-three and pull request #5875.
