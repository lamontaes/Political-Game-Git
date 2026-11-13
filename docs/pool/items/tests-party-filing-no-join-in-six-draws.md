---
id: tests-party-filing-no-join-in-six-draws
title: "The party filing test finds no one who joined a party as an act in six drawn places, red on clean main"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: wire-elections
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-tests-party-filing-no-join-in-six-draws
---

**What.** src/core2/party-filing.test.ts fails on clean main with GOLDEN_PATH_SEED=pet-run-1 after its six draws, because in none of the played years did anyone join a party as an act. The places it passed over were Monomoscoy Island, Massachusetts; Deepstep, Georgia; Carter, Oklahoma; McCalla, Alabama; Lehr, North Dakota; and Bethany, Oregon. Before the vacant-seat special race fix, the same seed stopped earlier with "No national party on side 0", which hid this red. The join act may have become rarer since the test was written on Oct 27, or the test's window may be too short. Guards: a resident can join a party before filing, which the filing screen shows.

**Cause.** Found in code: in a played world the only writer of a party tie whose reason starts `joined;` (src/core2/modules/parties.ts `joinParty`, line 451) is the party nominee rule, src/core2/modules/voting.ts `fileStandingCandidates` (line 1937): when a state or federal partisan race with no district closes filing with no candidate of a party on the ballot, that party's nominee, if a full person with no party tie, joins it that day. No one else joins a party as an act (the bench's player does, through src/bench/government.ts, which the test does not drive). It runs on the race's `filing-closes` calendar day (voting.ts line 671). The test's played case (src/core2/party-filing.test.ts lines 133 to 171) plays one year from the opening, 2025-01-20 to 2026-01-20, and most states close filing for their next statewide general in 2026, after that year, so most draws have no join. Seen in the Nov 10 re-run: pet-run-1 passed and a fresh seed (sweep-fresh-17136: Cayey, Puerto Rico; Oak Ridge, Louisiana; Mooresville, Indiana; ...) failed with 'no drawn place had a join as an act'. Whether a draw passes depends only on whether one of its places' statewide filing closes inside the year.

**Fix.** Change the test only: for each drawn place, read the contests table for the earliest state or federal contest without a district whose `filingDeadline` falls within two years of the opening, and play to the day after that deadline instead of a fixed 365 days (the drawn-place-tests skill's draw-and-wait); log each place passed over with the deadline it would have needed. Keep the membership assertion. Note for the elections lead, not part of this fix: no person in the world joins a party by their own decision; if the golden path needs party membership to grow, that is its own item.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never weaken a test to get green: find why no one joins a party as an act before changing the number of draws or the window. One rule, all 56 places: the test keeps drawing places from all 56 and names the places it passes over. Ask why: the PR names the cause by file and line.

**Done when.** A second session runs the party filing test on ten fresh GOLDEN_PATH_SEED draws in the played world (buildBenchWorld) and sees every run pass, each naming the drawn place, its seed and the record id of a join written as an act. The PR names the cause of the red by file and line.

**Waits on.** Nothing.

**Files.** src/core2/party-filing.test.ts, src/core2/modules/voting.ts, src/core2/modules/parties.ts

**Notes.** lead: elections. Found by the elections wire session on Oct 28 while running the tests for the petition line; the party engine is in the elections family, so it is this session's red under the Oct 28 14:40 ruling.

**Notes (re-run, 2026-11-10, main b4422d346c).** npx vitest run src/core2/party-filing.test.ts --maxWorkers=1 with OCD_STORAGE_OVERRIDE and NODE_OPTIONS=--max-old-space-size=8192, GOLDEN_PATH_SEED=pet-run-1: 2 of 2 passed (green on the item's own seed). Fresh draw GOLDEN_PATH_SEED=sweep-fresh-17136: red. Assertion as printed: `Error: no drawn place had a join as an act: Cayey, Puerto Rico (7215494), seed 240270723f333236f6d7047c08902fe007b8a33ba9eef7a689f4dfafd01eb92f: nobody joined a party as an act; Oak Ridge, Louisiana (2257205); Mooresville, Indiana (1850976); ...` at src/core2/party-filing.test.ts:171. Still red by draw.

Cause finder (Nov 11, 2026, for Fable B): read the one writer of a joined tie in a played world and when it runs; the test's one-year window ends before most states' statewide filing closes, so the result depends on the draw.

Claimed by next for agent-4bff (tier mid) (2026-11-13 04:38 UTC) on branch claude/pool-tests-party-filing-no-join-in-six-draws.

Released (2026-11-13): claimed by mistake by Account lead T18 while claiming another item; no work was done. Continue on branch claude/pool-tests-party-filing-no-join-in-six-draws.
