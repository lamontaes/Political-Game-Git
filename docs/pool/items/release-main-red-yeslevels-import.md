---
id: release-main-red-yeslevels-import
title: "Main does not load: public bargaining imports yesLevels from the file that no longer has it"
area: release
kind: bug
priority: 1
size: S
status: dropped
claimed-by: claude/main-red-yeslevels-import
pr: #6508
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T03:22:25.092Z
---

**What.** The bench server and every world build fail to load on main with: the requested module group-a-records does not provide an export named yesLevels. The one-reader change moved yesLevels to modules/laws.ts, and the public bargaining merge kept importing the deleted copy in group-a-bargaining.ts and its test. Nothing on main can play until it loads.

**Rules.** Replace, never layer: bargaining reads the laws engine's one yesLevels; no alias is put back in group-a-records. One source per fact: whether a policy is law here has one reader.

**Done when.** The bench starts on the fix (npm run bench answers /api/title), tsc reports nothing in src/core2/law-reach, and src/core2/law-reach-bargaining.test.ts loads and runs in a drawn place with its seed named in the PR body.

**Files.** src/core2/law-reach/group-a-bargaining.ts, src/core2/law-reach-bargaining.test.ts

**Notes.** TODO
