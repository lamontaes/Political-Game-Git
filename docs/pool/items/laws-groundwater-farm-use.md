---
id: laws-groundwater-farm-use
title: "Groundwater limits read farm pumping, irrigated acreage and crop response"
area: laws
kind: research
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: "split from laws-stopgap-reach-group-b-faked-mechanic, Oct 16"
claimed-at:
checked: fable 2026-11-10
---

**What.** Groundwater law reaches the existing agricultural output limit and the outside-sales flows, but a generic withdrawal share and irrigation elasticity stand in for actual farm pumping, irrigated acreage and crop response (SG-GOV-REACH-B-business-cost). Read each place's farm water use and crop exposure, the statutory allocations and the independent restrictions, and apply them at production. Non-farm use and resource services take only their own records. Real data calibrates the elasticity and the shares and never decides one farm's output.

**Cause.** Found in code: src/core2/modules/business.ts (the groundwater limit on farm output, `GROUNDWATER_LINK` at line 1215, with the stopgap marker for SG-GOV-REACH-B-business-cost at line 1251) applies a generic withdrawal share and irrigation elasticity; the policy rows that name the stopgap are in src/core2/data/laws/reach-group-b.json (lines 282 and 396) and the row is in src/core2/data/stopgaps/gov.json (status open).

**Fix.** Read each place's farm water use and crop exposure from sourced data and apply the allocation at production, so a named farm's output is limited by its place's allocation and crop response. A place without data starts from the state's average, marked ESTIMATED with its spread. Resolve the stopgap.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Research before building: real data calibrates the elasticity and the shares and never decides one farm's output. Estimate, never UNKNOWN: a place without data starts from the state's average, marked ESTIMATED with its spread. One rule, all 56 places.

**Done when.** A second session, not the builder, plays a drawn place with irrigated farms (name and seed in the PR body) in a one-year played world (`buildBenchWorld`). A named farm's output is limited by its place's withdrawal allocation and crop response, and the sales it lost, the owner's choice and the notice the owner received are shown by record ids. The group B reach test passes and SG-GOV-REACH-B-business-cost is resolved. Nothing on screen reads it yet.

**Waits on.** Nothing.

**Files.** src/core2/data/laws/reach-group-b.json, src/core2/modules/business.ts, src/core2/data/stopgaps/gov.json

**Notes.** Split from laws-stopgap-reach-group-b-faked-mechanic. Released from idle draft #5076 by the CTO, Oct 26. Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10): it would swap a generic withdrawal share for each farm's pumping and acreage; no player sees a farm's water use.

Lane 5 (pool truth, Nov 3): the item was open but still named an old claim, `claude/peaceful-ritchie-03780x` (2026-10-19). Cleared from the front matter and kept here.
