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

**Fix.** Account lead's ruling, Nov 16 08:00Z: no draw and no band. Day one is Inauguration Day (gameStartDate), so the approval starts at the share of the two-party vote the past election recorded for the sitting president (src/core2/past-elections.ts keeps it on their term) and moves from the first month by the existing mover. The 41 row and its spread are deleted.

**Time box.** 1 hour.

**Rules.** Estimate, never UNKNOWN: a value the player sees starts from the real average with a per-world spread.

**Done when.** A second session builds two worlds in drawn places on seeds nobody chose, with New Game's warm-up, and dev mode's "How this world opened" names the president's November 2024 race for the day-one approval, at that race's share, with no approval month before January 2025.

**Waits on.** Nothing.

**Files.** src/core2/modules/national-opinion.ts
