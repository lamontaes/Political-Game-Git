---
id: tests-mid-term-lieutenant-governor-case-red-after-opening-terms
title: "mid-term holder test: the Nevada lieutenant governor no longer files for the state senate seat once the opening seats the term in office on the start day"
area: elections
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: sonnet
effort: medium
source: views thread, Nov 16 (held-over seat red on the Train)
---

**What.** In src/core2/mid-term-holder-runs-elsewhere.test.ts, the case "a lieutenant governor mid-term who wins a state senate seat leaves the old seat to the vacancy engine" (seed bb22, played to 2029-01-10) expects exactly one holder of seat:US-NV:lieutenant-governor to file for seat:US-NV:upper:019:0 on 2028-11-07. On the Train it finds none. The case was written before the opening seated the term in office on the start day (the opening terms fold). Since then, `openOffices` takes the start date, and the people holding the seats on the start day changed.
Seen: Train b63879a81512d778d4e91be4d5181dd9d4cd9d44 with the test opening offices on its own start date: "holders of seat:US-NV:lieutenant-governor filed for seat:US-NV:upper:019:0: expected +0 to be 1". The other case in the file passes.

**Cause.** Needs cause. Looked at: the test was calling `openOffices` without the start date, which made both cases throw on bad module data. With the date passed, case 1 passes and case 2 fails as above. The pinned premise (that Nevada's lieutenant governor runs for that senate seat in that world) no longer holds. It is not yet known whether this is a fault in the opening terms or only a moved premise.

**Fix.** None until the cause is found.

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** One rule, all 56 places: the test keeps a named place and seed, and a re-pin names the old premise and why it moved, with the lead's yes first.

**Done when.** The case passes at a named place and seed on the Train, with its premise stated in the test, and a second session replays it there and in a drawn place (place and seed named).

**Waits on.** Nothing.

**Files.** src/core2/mid-term-holder-runs-elsewhere.test.ts

**Notes.**

- Nov 16, views thread: found while fixing the held-over seat test. That test, this one and the closed-race holders test all called `openOffices(core, seed)` without the start date the opening-terms change added.
