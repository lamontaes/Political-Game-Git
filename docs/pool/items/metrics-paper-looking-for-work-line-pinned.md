---
id: metrics-paper-looking-for-work-line-pinned
title: 'Pin a test that the paper''s "looking for work" line prints the town''s one jobless count'
area: world
kind: bug
priority: 2
size: S
status: merged
standard: 2
claimed-by:
pr: 9406
after: metrics-town-jobs-one-rule
blocked-on:
lead: jobs
model: sonnet
effort: medium
root: design-one-model-two-tiers
source: Account lead, Nov 15, after metrics-town-jobs-one-rule (#9391)
---

**What.** The paper tells "In all, N people in the town are looking for work" from the town's month row. No test prints that line, so a wrong count there would go unseen (after #9391 the figure at Washington, Kansas, July 2, 2025 moved from 36 to 35 and nothing checked it). A pinned test reads the printed line against the one counting rule. Seen: the paper's conditions story, "In all, N people in the town are looking for work."

**Cause.** Found in code: `src/bench/printed-words.ts`, the `conditions` builder (the `jobless` fact reads `month.unemployed` from the world-metrics month row); no test under `src/bench` words an `outcome-web.month` story and reads this line. Existing news tests (`src/core2/outcome-news.test.ts`) stop at the record.

**Fix.** A test at Washington, Kansas (599e6f66e9c1d25a) plays to June 2025 (the game writes each month's conditions record itself, nothing set by hand), words it through `wordPrintedStory` the way `src/bench/printed-civic.test.ts` does, and asserts the printed number equals `townLaborByPlace(...).seekers` for that month. The player sees the paper's line; no wording changes.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes and say what is left.

**Rules.** No hand-written player text in code; the line comes from the bank. Pinned named place and seed, limit near twice the measured time, with the played days named.

**Done when.** A second session runs the test in a drawn place (Washington, Kansas, seed 599e6f66e9c1d25a, is the pinned one), sees the printed line and its figure match the month row and the Metrics tab's looking-for-work row, and sees it fail when the row is changed by one.

**Waits on.** metrics-town-jobs-one-rule (#9391, folded).

**Files.** src/bench/printed-jobless-line.test.ts (new)

**Notes.** Asked for by the lead, Nov 15. Read the paper's other month-row reads at the same time (`printed-words.ts` around 1410 to 1475).
