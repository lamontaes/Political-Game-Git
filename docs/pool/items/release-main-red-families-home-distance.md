---
id: release-main-red-families-home-distance
title: "The families guard is red on main a third time: meetings.ts (#8507) imports home-distance.ts from inside the people family"
area: release
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/red-main-families-home-distance
pr: 8953
after:
blocked-on:
lead: cto
model: opus
effort: low
root: none
source: Red desk, Nov 12 (found running the guard suite on main for #8952)
---

**What.** tests/guards/families.test.ts fails on clean main f3c80276: src/core2/modules/meetings.ts has 6 imports inside other families against 5 known. It turns the guards check red on every pull request again, an hour after #8947 cleared it. Guards: every pull request's guard suite runs green.

**Cause.** Found in code: #8507 (7a0a9e20f8, "a town hall's room fills only with those for whom the evening is worth it") added `homeDistanceMiles` from src/core2/home-distance.ts to src/core2/modules/meetings.ts. That file is a leaf of the people family (it imports only the kernel, parameters and generated reference data) and is not one of the family's entries; src/core2/modules/parties.ts (elections) already read it as one of its 3 known deep imports.

**Fix.** List src/core2/home-distance.ts as an entry of the people family in tests/guards/families.json, as #8791 and #8947 did for leaves read across families, and lower src/core2/modules/parties.ts's known count from 3 to 2 in tests/guards/families-baseline.json, which the guard's own only-shrinks case asks for.

**Time box.** 0.5 hours

**Rules.** Replace, never layer: the file is named once as the family's face, with no copy beside it; the baseline only shrinks.

**Done when.** A second session runs `npx vitest run --dir . tests/guards/families.test.ts` on main and it passes, and the guard suite in the drawn place it names shows no families failure.

**Waits on.** Nothing.

**Files.** tests/guards/families.json, tests/guards/families-baseline.json
