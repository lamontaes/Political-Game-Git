---
id: nation-opening-approval-same-every-world
title: "Every world opens with the President's approval at 41%, though the estimate has a spread of 36 to 45"
area: world
kind: bug
priority: 3
size: S
status: in-pr
claimed-by:
pr: 9689
after:
blocked-on:
lead: nation
source: story builder thread, Nov 16, the Account lead's ruling on #9614
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The President's approval starts at the same 41% in every world, so every played year opens on the same poll. The opening level is an estimate with a spread, and the rule for estimates says each world draws its own value within that spread. Seen: the monthly poll on the News page reads 41% in January at every place and seed played.

**Cause.** Measured: at Wilmont, Minnesota (2770582), seeds approval-a, approval-b and approval-c, by `npx tsx` on a one-year run listing the `national.approval` records: each opens at 41% (41.07 at seed 2cb5aaf1). Found in code: src/core2/modules/national-opinion.ts `monthlyRun` reads `opinionParameter("openingPct")`, which returns the value 41 from src/core2/data/electorate/national-opinion.json and never its spread [36, 45].

**Fix.** Draw the opening once per world inside the parameter's spread through the one world draw (src/core2/world-draw.ts `worldOffsetUnit`, as macro-model.ts does for the economy's past), and keep the 41 as the center.

**Time box.** 1 hour.

**Rules.** Estimate, never UNKNOWN: a value the player sees starts from the real average with a per-world spread.

**Done when.** A second session builds two worlds in a drawn place on two seeds nobody chose, and the January polls differ inside 36 to 45, each naming its parameter row.

**Waits on.** Nothing.

**Files.** src/core2/modules/national-opinion.ts
