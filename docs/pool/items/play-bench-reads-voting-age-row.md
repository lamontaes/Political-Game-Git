---
id: play-bench-reads-voting-age-row
title: "The bench's checks and screens read the one voting-age row, not a typed 18"
area: play
kind: cleanup
priority: 3
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-bench-reads-voting-age-row
pr: #8536
blocked-on:
source: added with npm run pool -- add
after:
lead: play-first
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:46:37.131Z
---

**What.** Five bench sites still type the age of majority as 18 after the core moved to the one `votingAge` row in src/core2/data/parameters.json: src/bench/m0-check.ts (line 41), src/bench/m1-10-check.ts (line 131), src/bench/verify.mjs (line 125) and src/bench/whole-figures.ts (line 29, the teen band). A view or check that types its own version of a fact is a duplicate (AGENTS.md, first bullet). The earlier play.mjs home-label sites no longer type an 18 and need nothing.

**Cause.** Found in code: `age >= 18` and `age < 18` are typed in src/bench/m0-check.ts (line 41), src/bench/m1-10-check.ts (131), src/bench/verify.mjs (125) and `ageBandOf` in src/bench/whole-figures.ts (29), while src/core2/data/parameters.json holds the one `votingAge` row (line 211) that src/director/coming-of-age.ts already reads with `parameter("votingAge")`.

**Fix.** Read the age from the `votingAge` row at every one of those five sites, the same way src/director/coming-of-age.ts does.

**Time box.** 2 hours for one Sonnet session.

**Rules.** One engine per mechanic and the simulation as the one layer: a screen or check reads the age from the parameter table, never its own number. Every number lives in a parameter table.

**Done when.** A second session searches src/bench for an age compared with 18 and finds no site, and runs the changed checks (M0 and M1-10 steps in src/bench/m0-check.ts and src/bench/m1-10-check.ts) in a drawn place on a bench world with the place and seed named, with the same results as before the change; a test names the five sites.

**Waits on.** Nothing.

**Files.** src/bench/m0-check.ts, src/bench/m1-10-check.ts, src/bench/verify.mjs, src/bench/whole-figures.ts, src/core2/data/parameters.json

**Notes.** Filed by wire-elections-and-campaigns (law-reach age rows). lead: play-first.
