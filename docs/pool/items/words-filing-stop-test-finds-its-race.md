---
id: words-filing-stop-test-finds-its-race
title: "The filing and campaign-stop test finds a race and checks the records it keeps"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** electoral-scenes.test.ts was red on main by draw. It looked for an open local race only on the game's first day (most towns have none, so draws gave up), filed residents already running (their second filing folded into the first one's scene and read as missing), and checked a stop's crowd against a speech record the log never kept (its filers were not in focus).

**Rules.** Never loosen a test: what it checks is unchanged; only how it finds its race and whom it files.

**Done when.** On the seed that failed (a4e1ae7d7311f88891bc0580d016a18aa617c3c4) the test passes: a filing scene with the office's clerk and campaign stops whose crowds are the speeches' recorded audiences.

**Files.** src/director/electoral-scenes.test.ts

**Notes.** TODO
