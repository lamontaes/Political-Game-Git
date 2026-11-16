---
id: elections-decided-seat-opens-no-next-contest
title: "A county board seat decided on Nov 3, 2026 opens no next contest after its winner is seated"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: counted-carry thread, Nov 15 (found while fixing elections-kept-counted-ballot-drops-life-and-popularity)
---

**What.** src/core2/two-level-elections.test.ts fails with "Commissioner seat:gus2025:176539:board:0: expected false to be true" at `GOLDEN_PATH_SEED=tl-c` (a Vermont place), on the train at 29ef4685 with its kept-split check skipped and with elections-kept-counted-ballot-drops-life-and-popularity built. The seat's Nov 3, 2026 race is decided, but no later contest for that seat exists once every Nov 3 winner has taken office. Seen: the seat's next election is missing from the election calendar and from Records in dev mode.

**Cause.** Needs cause. Measured only as above; where to look: how a seated winner schedules the seat's next cycle (`takeOffice` and the contest scheduler in src/core2/modules/voting.ts and src/core2/modules/elections.ts) for a county board seat whose term or cycle data may be missing.

**Fix.** None until the cause is found.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** One rule, all 56 places: the next cycle comes from the seat's data, never a named place.

**Done when.** two-level-elections passes the next-contest check at tl-c and at two more seeds with county board seats, named in the PR; a second session, on the train or main in a drawn place with a county board seat that it names with its seed, plays past the seat's winner taking office and sees the seat's next election in dev mode's Records.

**Waits on.** Nothing.

**Files.** src/core2/two-level-elections.test.ts, src/core2/modules/voting.ts, src/core2/modules/elections.ts
