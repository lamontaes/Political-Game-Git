---
id: world-official-pay-not-caught-up-us-house
title: "A U.S. representative's pay is short by about nine times the day's pay a year in (Whitefield, New Hampshire, seed 9a11da355dc8b557)"
area: gov
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Fixed (Oct 17, claude).** The pay row now ends with the official: `payMonth` removes the row of anyone no longer alive. Pay for the days between the last payday and the death is not paid (no estate engine reads it yet). `src/core2/official-pay-death.test.ts` pins the seed above and a random place; it fails without the change.
