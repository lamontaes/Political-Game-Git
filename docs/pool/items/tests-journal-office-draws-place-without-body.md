---
id: tests-journal-office-draws-place-without-body
title: "journal-office.test draws a place with no town council, board or township and fails (Cruz Bay, U.S. Virgin Islands, seed f55344016ce873c9)"
area: people
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/journal-office-draw
pr: #5231
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T22:47:13.970Z
---

**What.** `src/director/journal-office.test.ts` fails on clean main with seed f55344016ce873c9 in Cruz Bay, U.S. Virgin Islands: it takes the first office that covers the town and is a council, county board or township board, and the Virgin Islands have no local government, so there is none. The failure is in how the test draws its place, not in the journal. Draw the next place when the drawn one has no body to vote in, and fail by name, with every place tried, when none of eight has one.

**Rules.** No dice: the test reads the officeholder's journal from the records and its place is drawn from all 56 by a named seed. One rule, all 56 places: a place without a town body is skipped, not special-cased by name. Wire to the world: the journal still tells taking office, a vote, a town hall and an interview, each citing its record id.

**Done when.** In the played world (buildBenchWorld), `JOURNAL_OFFICE_SEED=f55344016ce873c9 npx vitest run src/director/journal-office.test.ts` passes, it passes on a further random seed, and it fails by name if none of eight drawn places has a body to vote in.

**Files.** src/director/journal-office.test.ts

**Notes.** Found Oct 19 while checking whether people-journal-taking-office is the duplicate its notes say: the test it cites passes except when the drawn place has no local body.
