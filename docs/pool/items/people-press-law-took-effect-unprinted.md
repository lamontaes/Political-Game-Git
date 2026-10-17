---
id: people-press-law-took-effect-unprinted
title: "A town law that took effect is printed by no outlet in some towns, so no one can bring it up"
area: people
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Golden-path step 10 needs the town's press to print a law taking effect so people can read and bring it up. In the eight-place path-check sweep of Oct 17 (claude), three places reached step 9 (a resident officeholder's bill passed and took effect) with no story at all for that law: Rathdrum, Idaho (seed swdddd3ccf), Union, Alabama (sw86265759) and Proctor, Minnesota (swa8b236bd). Union has nine outlets, four of them local television, and 1,264 stories by the end, yet none for `law-took-effect:<law id>`. Find why: whether the wire item exists, whether a local reporter ranks it (`runDesk`, `src/core2/press-desk.ts`) below the week's other items every week of its freshness, and whether a town law should rank by whom it reaches (a minimum-wage or fee change reaches every worker) rather than by proximity and subjects alone.

**Rules.** No dice: a story's rank comes from who the law reaches and each reporter's own drives, never a roll. Estimate, never UNKNOWN: a rank the desk cannot read starts from the average with its source.

**Done when.** In the three seeds above, `reachedSteps` reports step 10 for the bill's sponsor, or the item records, by wire id and week, which stories outranked the law and why that is right; a test names the place and seed.

**Files.** src/core2/press-desk.ts, src/core2/modules/press.ts, src/bench/reached.ts

**Notes.** Deer Island, Oregon (seed pc-d) reached step 10 in the same check, so the path works where the law is printed. This may be correct play (a quiet town's small law is not news); then the check should accept another way people learn of it.
