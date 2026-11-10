---
id: tests-housing-apartment-gate-too-narrow
title: "The housing family test's apartment gate leaves almost only Washington, D.C. as a drawable place"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
after:
lead: laws-effects
model: sonnet
effort: low
root: none
checked: fable 2026-11-10
---

**What.** src/core2/law-wiring-housing.test.ts draws a place only if it would start at least two apartment buildings' worth of apartments in the days the test plays, at its state's permit rate (apartmentsPermitted, the gate). On Oct 24 both the named seed (7c1e5a9d03b2f648) and a fresh seed (2225ee2fab3164f793604a2e8fb7a177105881e6) drew Washington, D.C., because few places pass that gate, so the family test proves the zoning laws in one place. A test draws from all 56 and its subject filter should keep many of them drawable. Guards: zoning laws the player passes change housing in any town, not only in D.C.

**Cause.** Found in code: src/core2/law-wiring-housing.test.ts, function apartmentsPermitted (line 82), is used as the gate at lines 294 to 298 ("no subject: about N apartments permitted") and again at line 1064, and asks for two buildings' worth of apartments, which keeps few places drawable.

**Fix.** Lower the gate to one expected building, or play longer, and show that three fresh seeds draw three different places.

**Time box.** 2 hours.

**Rules.** One rule, all 56 places: a test draws from all 56 and its subject filter should keep many of them drawable. No dice: the gate reads the state's permit rate, not a roll.

**Done when.** A second session runs the family test in src/core2/law-wiring-housing.test.ts on three fresh seeds and sees it pass on three different drawn places, each named with its seed, none of them Washington, D.C. by default, with the gate's expected building count printed.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-housing.test.ts

**Notes.** From the laws lead's housing and credit helper, Oct 24.
