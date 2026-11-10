---
id: core-opening-public-coverage-conflict-bayou-blue
title: "The world cannot be built in Bayou Blue, Louisiana: two coverage rows for one government and place disagree"
area: core
kind: bug
priority: 1
size: S
status: blocked
standard: 2
claimed-by: claude/bayou-blue-coverage
pr: #5944
after:
blocked-on: core-opening-coverage-every-locality
model: sonnet
effort: medium
root: rc9-place-facts-one-default
lead: m0-m2
source: added with npm run pool -- add
claimed-at: 2026-10-25T19:13:27.677Z
checked: fable 2026-11-10
---

**What.** buildBenchWorld for Bayou Blue, Louisiana (place key 2205175, seed e955294c587729831a6cee88a3d0927ecf6a630617722d4bd7ad78cc74505e07) once threw 'Conflicting represented public owner coverage' because two coverage rows for one government and place (gus2025:166006) carried different represented resident counts. That crash was fixed in #5899, and the per-jurisdiction regression merged under core-county-governed-openings-per-jurisdiction. What remains is the exhaustive check: a test that builds the opening for every locality whose governments carry more than one coverage row for a place and names any that fail. The sibling item core-opening-coverage-every-locality asks for the same script, so whichever lands first closes both.

**Cause.** Found in code: src/core2/opening-customers.ts line 1438 still throws `Conflicting represented public owner coverage` when two rows for one government and place disagree. The Bayou Blue, Louisiana case (2205175, seed e955294c587729831a6cee88a3d0927ecf6a630617722d4bd7ad78cc74505e07) was fixed in #5899, but no test builds every locality whose governments carry more than one coverage row.

**Fix.** Add a test or script (see core-opening-coverage-every-locality, which wants it under src/core2/tooling/) that builds the opening for every locality whose governments carry more than one coverage row for a place and names any that throw. Fix what it finds at the cause: one coverage per government and place from its records.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: every drawn place's opening must build, so a government covering one place twice is resolved from its records (one coverage per government and place), never by skipping the place, and the localities are enumerated from the place records, never a named list.

**Done when.** A second session, not the builder, runs the check on main: it lists every locality whose governments carry more than one coverage row for a place, builds each opening, and prints the count checked and each place key that throws (none, or each named with its cause). Bayou Blue, Louisiana (2205175, seed e955294c587729831a6cee88a3d0927ecf6a630617722d4bd7ad78cc74505e07) builds in the played world.

**Waits on.** core-opening-coverage-every-locality, the sibling item that builds the same all-localities check; this item closes when that lands.

**Files.** src/core2/opening-customers.ts, src/core2/opening-customers-county-office.test.ts

**Notes.** TODO

Sent back 2026-10-24 from PR #5944 (branch claude/quirky-ride-vrwwz4-coverage): the fix is already on main through #5899 and the PR has zero remaining diff, but its table explicitly leaves exhaustive multi-coverage-locality acceptance unmet; reconcile that clause or an explicit bounded split on that branch, merge main into it first.

Oct 25 (Merger 0): PR #5944 now delivers only the bounded per-jurisdiction regression under core-county-governed-openings-per-jurisdiction. It does not complete the exhaustive all-localities acceptance; that remains here and neither original item is finished by this merge.

**Notes (Fable's check, Nov 10, proposed for the CTO).** Proposed: drop as a duplicate of core-opening-coverage-every-locality, which is claimed and builds the same check over every locality. That item's done-when should name Bayou Blue, Louisiana (2205175, seed e955294c587729831a6cee88a3d0927ecf6a630617722d4bd7ad78cc74505e07) as one of the places it prints.
