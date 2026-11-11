---
id: laws-stopgap-laws-missing-engine
title: "Stopgaps in laws (missing-engine): 1 open"
area: laws
kind: stopgap
priority: 3
status: open
standard: 2
claimed-by:
pr: #5575
blocked-on:
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/laws.ts, kind missing-engine"
claimed-at:
after:
lead: laws-effects
model: sonnet
effort: low
root: rc9-place-facts-one-default
size: S
checked: fable 2026-11-10
branch: claude/pool-laws-stopgap-laws-missing-engine
---

**What.** The public pay floor's employer-to-level map treats public schools as town employers (stopgap SG-GOV-public-pay-floor-owner in src/core2/data/stopgaps/gov.json). The day-of-hire hold was fixed in PR #5285 (`publicPayFloorHourly`); school districts still need their own level so a floor set at the district binds only the district. Give them one and close the row.

**Cause.** Found in code: `employerLevels` in src/core2/data/laws/public-pay-floor.json (line 3 names the stopgap) maps school employers to the city level, read by `publicEmployerLevel` in src/core2/public-pay-floor.ts (line 43).

**Fix.** Give school districts their own level in the map and read it at the review; mark the stopgap row resolved.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Never close a row by deleting it; registered stopgaps; replace, never layer; numbers in the parameter table (SOURCED, ESTIMATED or TUNABLE).

**Done when.** A second session, not the builder, plays a year in a drawn place (place and seed named) and sees a school-district employee's pay held to the floor of the district's own level, by pay record id, with SG-GOV-public-pay-floor-owner resolved, never deleted, in src/core2/data/stopgaps/gov.json.

**Waits on.** Nothing.

**Files.** src/core2/data/laws/public-pay-floor.json, src/core2/public-pay-floor.ts, src/core2/modules/laws.ts, src/core2/data/stopgaps/gov.json

**Notes.** First row: The public pay floor's employer-to-level map is a first cut (public schools count as town employers), and a later public hire is held to the floor at the next monthly review rather than on the day it is hired. Councils,

Public hire held to floor on day of hire was resolved in PR #5285 via publicPayFloorHourly; employer-to-level map (school districts as own level) remains open.

Sent back 2026-10-21 from PR #5575 (branch claude/laws-missing-engine): The conflict correction is present: the marker is data/laws/public-pay-floor.json:3 and the jobs-opening wording matches main. The remaining issue is acceptance: docs/pool/items/laws-stopgap-laws-missing-engine.md:20 requires the row resolved and its replacement read by another engine in a one-year played-world run, by record id. The changed src/core2/data/stopgaps.json row at 3429-3436 deliberately leaves school districts mapped to city employers and status open, and the PR contains no such played-world proof. Please finish that acceptance on this branch, or move this truthful registry-only correction to a bounded pool item with its own acceptance and leave the broader engine item open. This is a done-when review finding, not a missing-checks-line objection; no local gates are claimed.; finish on that branch, merge main into it first.

Released (2026-11-11): a school-district level means a new government level in the law chain (LawLevelName, floorsByLevel, ORDER) with its own lawmaker; mapping schools to a level nothing enacts at would just stop town and county floors binding them; needs the laws lead's design, not started. Continue on branch claude/pool-laws-stopgap-laws-missing-engine and pull request #5575.
