---
id: tests-renter-rate-shorter-pinned-window
title: "The counted renter buying-rate test takes nine minutes, close to its ten-minute limit"
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
lead: laws-effects
source: Laws thread, Nov 15, 2026, fixing the Bastrop red on #9558 (builders start houses again)
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** src/core2/housing-counted-renter-rate.test.ts plays a whole year a day at a time at three pinned towns and takes 573 seconds on a quiet cloud container, against a limit of 600 seconds a test. A slower runner turns it red with nothing wrong, and every gate that runs it pays nine minutes. The cost is to every builder and checker. Guards: housing-builders-start-nothing-after-the-opening, whose new homes this test now counts.

**Cause.** Found in code: `playYear` in src/core2/housing-counted-renter-rate.test.ts steps 365 days with `advanceCore` one day at a time and reads the stock and purchases after each, so that leases come up on their own anniversary months; the year is the unit the rate band is measured over. Measured: on #9558 at 5a0fd6f1, Bastrop LA, Bloomingdale NJ and Storrs CT pass 3 of 3 in 573 seconds.

**Fix.** Find a shorter pinned window that keeps both checks: the rate band (a window where enough leases come up that the band still holds by the same standard error) and the no-overdrawn-day check (which needs only the days with purchases). Pin it, set the limit near twice the time, and say the window's premise in the test. Nothing the player sees changes.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** One rule, all 56 places: the towns stay named in the file with their seeds, and a shorter window must not swap them for easier ones.

**Done when.** A second session runs src/core2/housing-counted-renter-rate.test.ts on main and sees it pass in under half its limit at the same three pinned towns, finds the window and its premise written in the test, and plays the same window at one drawn place to see renters buy within the band.

**Waits on.** #9558 (the builders' fix, which this test now covers).

**Files.** src/core2/housing-counted-renter-rate.test.ts
