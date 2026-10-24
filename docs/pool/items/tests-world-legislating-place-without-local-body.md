---
id: tests-world-legislating-place-without-local-body
title: "The local-ordinances legislating test fails on a drawn place with no council or county board"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** src/core2/world-legislating.test.ts, "the town's council and county board bring their own ordinances on their schedule", draws a state whose legislature sits in 2026 and then any locality in it. When the drawn locality has no council and no county-board office (seen Oct 24 on US-VI territory:VI:frederiksted-southeast, run on the words/bargain-scenes branch), the expected meeting count is 0 and the check that it is above 0 fails. The test does not print its seed, so the draw cannot be replayed. Either draw again until the place has a local body (and say in the message why each skipped place had none), or, if every place should have one, add the missing local bodies for that place's data.

**Rules.** One rule, all 56 places: the draw covers every place, and a place's facts live in data. Ask why: the failure names the place, the seed and the reason.

**Done when.** The test prints its seed, redraws past a place with no council or county board and names why it skipped it, and passes on the US-VI draw and on a fresh seed.

**Files.** src/core2/world-legislating.test.ts

**Notes.** Found Oct 24 by the Words session while checking words/bargain-scenes; that branch adds one fact to the legislature's bill-amendment record and does not touch meetings, so this is on main too.
