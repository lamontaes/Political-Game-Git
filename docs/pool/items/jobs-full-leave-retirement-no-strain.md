---
id: jobs-full-leave-retirement-no-strain
title: "jobs-full-leave test fails for a retirement row with no strain value (seed c0f1414ba7642012)"
area: world
kind: bug
priority: 2
size: S
status: dropped
claimed-by:
pr:
blocked-on: cto-drop-filed-in-error
source: added with npm run pool -- add
claimed-at:
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO

**Files.** TODO

**Notes.** TODO

**Closed Oct 17.** Filed in error: main already filters a counted worker who retired and was filled in since (the test no longer asserts a strain value for it), and seed c0f1414ba7642012 passes on current main. The CTO may drop this item.
