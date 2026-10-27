---
id: tests-housing-apartment-gate-too-narrow
title: "The housing family test's apartment gate leaves almost only Washington, D.C. as a drawable place"
area: laws
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** `src/core2/law-wiring-housing.test.ts` draws a place only if it would start at least two apartment buildings' worth of apartments in the days the test plays, at its state's permit rate (`apartmentsPermitted`, the gate at line 211). On Oct 24 both the named seed (7c1e5a9d03b2f648) and a fresh seed (2225ee2fab3164f793604a2e8fb7a177105881e6) drew Washington, D.C., because few places pass that gate, so the family test proves the zoning laws in one place.

**Rules.** One rule, all 56 places: a test draws from all 56 and its subject filter should keep many of them drawable.

**Done when.** The gate asks for one expected building rather than two, or the test plays long enough, and the family test passes on three fresh seeds that draw three different places, named with their seeds.

**Files.** src/core2/law-wiring-housing.test.ts

**Notes.** From the laws lead's housing and credit helper, Oct 24.
