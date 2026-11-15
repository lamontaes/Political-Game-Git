---
id: tests-two-level-ticket-office-kept-ballots
title: "two-level-elections expects a lieutenant governor elected on the governor's ticket to have counted ballots of its own"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-hjvzia-ticket-test
pr:
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: sonnet
effort: medium
source: counted-carry thread, Nov 15 (found while fixing elections-kept-counted-ballot-drops-life-and-popularity)
---

**What.** src/core2/two-level-elections.test.ts fails with "Lieutenant Governor: expected 0 to be greater than 0" at `GOLDEN_PATH_SEED` tl-a (New Mexico), tl-b (Kansas) and tl-e (Kansas), on the train at 29ef4685 with its kept-split check skipped and with elections-kept-counted-ballot-drops-life-and-popularity built. The kept-split failure stopped the test before this contest until then. Guards: the two-level election test reads each race the way its count decides it.

**Cause.** Found in code: a ticket office is decided with its governor race (`decidedWithGovernor` and `decideTicket` in src/core2/modules/voting.ts), so `holdElection` never runs for it and no counted-ballots row is kept under its own contest id. The test's per-contest loop asks `countedBallotsOf(api, contest.id)` for every contest on Nov 3, 2026 and expects rows, which predates the ticket rule.

**Fix.** In the test, a contest that `ticketGovernorContest` joins to a governor race reads that governor contest's kept ballots for the counted checks, and its own result is checked against the governor's ticket result; every other contest is unchanged. No change to the engine; no loosened check.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** One model, two tiers: the ticket office's counted ballots are the governor race's, read there by the same rule, never skipped. Never loosen a test to get green.

**Done when.** two-level-elections passes past the ticket office at tl-a, tl-b and tl-e (Kansas), and the PR names two more seeds where a ticket office is on the ballot; a second session, on the train or main in a drawn place with a ticket office that it names with its seed, opens the lieutenant governor's result in dev mode's Records and sees it decided with the governor's count.

**Waits on.** elections-kept-counted-ballot-drops-life-and-popularity (its fault stops the test first).

**Files.** src/core2/two-level-elections.test.ts

**Notes.** Nov 15 (counted-carry thread): built on #9566's head. The test reads the governor race's kept ballots for a ticket office and maps a no-party filing to the governor it runs with; it passes at tl-a, tl-b, tl-e, tl-j (Alaska) and tl-k (Connecticut), each with a lieutenant governor on the ticket, and at tl-d and tl-f.
