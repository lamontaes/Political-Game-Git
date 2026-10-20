---
id: executive-test-red-us-vi-cabinet-employer
title: "executive.test fails on main in the U.S. Virgin Islands: a cabinet appointee's job is paid by the territory treasury where the test expects none"
area: gov
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/executive-vi-cabinet
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T11:44:47.731Z
---

**What.** executive.test.ts (department heads and the cabinet are appointed with reasons and confirmation) fails at seed d5789127367692cf22c25b331324adada5742e0af00100e4cf04d84cd45fe9f7, place territory:VI:frederiksted: person:cabinet:US-VI:agriculture has an employer organization:treasury:US-VI where the test expects undefined. The same seed fails on clean main (checked Oct 20), so it is not caused by any open PR.

**Rules.** One rule, all 56 places: no place named in code; fix at the root (either the test's expectation for a territory whose treasury employs its cabinet, or the appointee's employer), and run the test at this seed.

**Done when.** executive.test.ts passes at GOLDEN_PATH_SEED=d5789127367692cf22c25b331324adada5742e0af00100e4cf04d84cd45fe9f7 and at two other seeds.

**Files.** src/core2/executive.test.ts, src/core2/modules/executive.ts

**Notes.** Found Oct 20 (claude) while merging main into #5413.
