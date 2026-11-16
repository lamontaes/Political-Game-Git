---
id: tests-outcome-news-pin-its-seed
title: "The outcome-news test draws its seed at run time, and is red at Adamsville, Tennessee: a reader's view moves against the side the story argued"
area: director
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
lead: views
source: story builder thread, Nov 16, the Account lead's ask on the reds of #9604
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The outcome-news test draws a new seed every run, so it is green or red by luck. On one draw a reader of a condition story moves away from the side the story argued, and the test expects no move or a move toward it. Seen: Adamsville, Tennessee, red the same with and without #9604.

**Cause.** Measured: at Adamsville, Tennessee (US-TN), seed db6727044495ce2c, by `OUTCOME_NEWS_SEED=db6727044495ce2c npx vitest run src/core2/outcome-news.test.ts`: person_8156b0336483cd5f, on 2026-01-06, by news.read:printed:outlet:television:3:jurisdiction_263b22db374adfbc:outcome-web.month:jurisdiction_263b22db374adfbc:2026-01:2026-01-06:enact:budget-line:incomeSecurity, moved -0.019 where the test expects 0 or more. Found in code: src/core2/outcome-news.test.ts line 45 draws with `randomBytes` when `OUTCOME_NEWS_SEED` is unset.

**Fix.** Pin the test to named places with fixed seeds (skill `pinned-tests`), Adamsville at the seed above among them. Then trace that reader's stance on the day by its causes. If something else moved it the same day (another read, a talk, a price), the test should measure the read's own cause, not the day's total. If the read itself moved it against its side, that is a views defect and gets its own item.

**Time box.** 2 hours.

**Rules.** Ask why: the move is traced to the record that caused it.

**Done when.** A second session runs the pinned test, which names Adamsville and its seed, and it is green. A drawn place, Adamsville, Tennessee (seed db672704), names the cause of that reader's move on 2026-01-06.

**Waits on.** Nothing.

**Files.** src/core2/outcome-news.test.ts
