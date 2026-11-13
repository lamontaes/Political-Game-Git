---
id: tests-macro-outlook-differs-from-lived-months
title: "The country outlook no longer matches the months the game then lives (macro.test, 2028-01 off by 0.066)"
area: world
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: nation
model: opus
effort: medium
root: none
source: Red desk, Nov 13 (seen while proving PR #8996)
---

**What.** src/core2/macro.test.ts, "the outlook is the months the game then lives, and it writes nothing", fails on clean main 8ce733c3 at its own random seed: seed outlook-50grcswm, 2028-01, expected 4.5806 to be close to 4.5143 (difference 0.066, within 5e-7 wanted); another run gave outlook-qk7004zj, 2028-01, 3.4147 against 3.3534. The figure compared is one of unemployment, inflation or hourly pay, three years out. Seen: dev mode's outlook shows the months the game then lives, figure for figure.

**Cause.** Measured: `npx vitest run src/core2/macro.test.ts -t "the outlook is the months"` on clean main 8ce733c3, two runs, both failing in 2028-01. Not found: what differs between `countryOutlook` (src/core2/modules/macro.ts, which steps the tier with the parts held the same each month) and the months lived (which count the played places' part from their own records each month since #8333). The first month that differs, and by which figure, is the next read. The test's seed is drawn with `Math.random`, so it prints the seed but cannot be replayed by GOLDEN_PATH_SEED; reading it with a fixed seed is the first step.

**Fix.** Needs cause.

**Time box.** 2 hours

**Rules.** One system: the outlook and the lived months run the same engine on the same records, so a difference is a read one makes and the other does not. No dice: the test's seed should be replayable from the run seed.

**Done when.** A second session runs macro.test.ts on main three times and at a fixed seed it names, in the drawn opening it prints, and the outlook's months match the lived months within the test's bound each time.

**Waits on.** Nothing.

**Files.** src/core2/macro.test.ts, src/core2/modules/macro.ts
