---
id: elections-decided-seat-opens-no-next-contest
title: "The two-level elections test stops before a race no one won opens its seat's next contest"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-hjvzia-test-wait
pr: #9594
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: counted-carry thread, Nov 15 (found while fixing elections-kept-counted-ballot-drops-life-and-popularity)
---

**What.** src/core2/two-level-elections.test.ts fails with "Commissioner seat:gus2025:176539:board:0: expected false to be true" at `GOLDEN_PATH_SEED=tl-c` (a Vermont place), on the train at 29ef4685 with its kept-split check skipped and with elections-kept-counted-ballot-drops-life-and-popularity built. The seat's Nov 3, 2026 race is decided, but no later contest for that seat exists once every Nov 3 winner has taken office. Seen: the seat's next election is missing from the election calendar and from Records in dev mode.

**Cause.** Found in code: the test in src/core2/two-level-elections.test.ts waits until the last Nov 3 winner takes office, then looks for each seat's next contest. A race no one won has no take-office day; src/core2/modules/voting.ts records it as an empty race due on the term's start (Feb 1, 2027 at this place) and opens the seat's next cycle only when `resolveEmptyRace` settles it that day. At tl-c the county board races had no filer (the incumbent flag, elections-closed-local-race-holder-never-weighs), so the test looked on Nov 5 for contests the engine opens on Feb 1. The engine is right; the test stops too early.

**Fix.** The test waits for the later of each decided race's take-office day and its empty race's due day. No engine change.

**Time box.** 1 hour, Opus at medium effort.

**Rules.** One rule, all 56 places: the next cycle comes from the seat's data, never a named place.

**Done when.** two-level-elections passes the next-contest check at tl-c and at two more seeds with county board seats, named in the PR; a second session, on the train or main in a drawn place with a county board seat that it names with its seed, plays past the seat's winner taking office, or past the term's start for a race no one won, and sees the seat's next election in dev mode's Records.

**Waits on.** Nothing.

**Files.** src/core2/two-level-elections.test.ts
