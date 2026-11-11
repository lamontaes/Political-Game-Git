---
id: research-residents-district-placement-sourced
title: "Research: place a split town's households into its legislative districts by each district's own Census mix (SG-CORE-district-placement)"
area: people
kind: research
priority: 2
size: M
status: dropped
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
lead: researcher
after:
checked: fable 2026-11-10
---

**What.** SG-CORE-district-placement in src/core2/modules/residents.ts: a town split between state legislative districts places its counted households into the districts by income order, filling each in proportion to its Census population, so each district holds a slice of the town's income ladder. Replace it with each district's own Census tables (ACS by state legislative district: income, tenure, age) and its election results, so households are placed by the district's real mix. An earlier attempt on branch claude/district-placement was closed as stale on Oct 29 and the branch is kept; claiming this item takes it over.

**Cause.** Found in code: `DISTRICT_STOPGAP` (SG-CORE-district-placement, line 497) in src/core2/modules/residents.ts places a split town's counted households into districts by income order, and the source file it once read (src/core2/data/district-household-income.json) is gone.

**Fix.** Source each district's own Census household-income, tenure and age tables, read them in src/core2/modules/residents.ts instead of the income-order split, and show each district's mix in a drawn split town; take over branch claude/district-placement.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Research before building: real data checks the simulation and never decides an outcome by itself. Estimate, never UNKNOWN: a value the source lacks for a place starts from the real average with a per-world spread, marked ESTIMATED with its source, never shown to the player. One rule, all 56 places: a figure that varies by place is a per-place table in data, never a state named in logic. Follow .agents/skills/researcher/SKILL.md.

**Done when.** A second session plays a one-year world (buildBenchWorld) in a drawn split town (place and seed named in the PR) and sees each district's household mix of income, tenure and age follow that district's own Census table, by record id, with where the town landed reported beside the Census figure and not as a pass mark. Each row is SOURCED or ESTIMATED with a citation and a spread, SG-CORE-district-placement is resolved in its family file under src/core2/data/stopgaps/ with the source named, and the research-data-reader guard, tripwire and calibration-guard tests pass.

**Waits on.** Nothing.

**Files.** src/core2/modules/residents.ts, src/core2/data/parameters.json, src/core2/data/stopgaps/core.json, data/research/people

**Notes.** TODO

Tracking corrected 2026-10-20: this split item was created in-pr after PR #5698 had already been sent back for formatting src/core2/data/district-household-income.json. The branch claude/district-placement still has no commit after that review, so the item is open, matching the existing Cloud merger comment; finish on that branch and merge main into it first.

Oct 29 (CTO, second account): PR #5698 closed as stale under the owner's standing approval; back to open. Branch `claude/district-placement` is kept; claiming this item takes it over.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have placed a split town's households into districts by each district's own Census mix; no player sees a split town's slice of the income ladder.
