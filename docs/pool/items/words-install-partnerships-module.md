---
id: words-install-partnerships-module
title: "Add the partnerships module to the played world's people list (one line in src/director/play-modules.ts)"
area: words
kind: wiring
priority: 1
size: S
status: blocked
claimed-by:
pr:
blocked-on: people-partnership-forms
source: added with npm run pool -- add
---

**What.** TODO

**Rules.** TODO

**Done when.** TODO **On screen.** Nothing yet: it would show on the People web and the Journal, and nothing there reads it.

**Files.** TODO

**Notes.** TODO

**Notes (pool redo, Nov 10, proposed for the CTO).** Proposed: drop, already done on main. The item is an empty shell. partnershipsModule is imported (src/director/play-modules.ts line 17) and listed in the played world's module list (line 44); partnership work now lives in the people-partnership items (this item's blocked-on, people-partnership-forms, is still open and is not needed for the install).
