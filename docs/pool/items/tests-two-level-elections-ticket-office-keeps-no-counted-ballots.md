---
id: tests-two-level-elections-ticket-office-keeps-no-counted-ballots
title: "The two-level elections test expects kept ballots for a lieutenant governor who is elected on the governor's ticket"
area: elections
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: low
root: none
source: Fable B, Nov 15, 2026, from the gate of #9488
---

**What.** `src/core2/two-level-elections.test.ts` fails "Lieutenant Governor: expected 0 to be greater than 0" where the town's state elects its lieutenant governor on the governor's ticket. Until #9488 an earlier check in the same test failed first at every seed, so this one was never reached. Nothing a player sees is wrong; a red test hides the next real fault. Seen: the test's own line 138, for the Lieutenant Governor contest of November 3, 2026.

**Cause.** Found in code: the test asks every contest that has a result for its kept counted ballots (`countedBallotsOf`, src/core2/modules/voting.ts) and expects at least one. A ticket office is decided on its governor's count and keeps no ballots under its own contest id (the running mate's filing carries `ticketWith`; pull request #8939 made the ticket office win with its governor on the same count). Measured with pull request #9488 applied to the train at 53e4b29fe8: GOLDEN_PATH_SEED=fb1 (Illinois) and fb3 (Connecticut) fail this way; fb2 (Texas, elected apart) and fb4 (New Hampshire, no such office) pass.

**Fix.** In the test, a contest whose candidates all filed on a governor's ticket (`ticketWith` on every filing) is checked against the governor's contest: its result names the same winner's party and it keeps no ballots of its own. The check for every other contest stays as it is. This narrows one assertion, so the lead says so in the pull request (skill pinned-tests, rule 5). The test is pinned to one ticket state and one state that elects the office apart.

**Time box.** 1 hour.

**Rules.** Never loosen a test to get green without the lead's word. One rule, all 56 places: the check reads the filing's own ticket, never a list of states.

**Done when.** A second session runs `GOLDEN_PATH_SEED=fb1 npx vitest run src/core2/two-level-elections.test.ts` and the same with fb3 on the train and sees both pass, and in the running game in a drawn place it names with its seed, in a state that elects the two on one ticket, opens Elections after the November 2026 count and sees the lieutenant governor's race show its governor's result.

**Waits on.** #9488, which clears the check that fails before this one.

**Files.** src/core2/two-level-elections.test.ts
