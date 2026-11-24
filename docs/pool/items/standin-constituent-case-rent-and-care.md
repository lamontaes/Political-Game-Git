---
id: standin-constituent-case-rent-and-care
title: "A constituent's case opens for a rent notice and for a sick relative, and the official's help does what that problem needs"
area: gov
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: governing
standard: 2
model: opus
effort: medium
root: design-director-on-core2
---

**What.** Stand-in SG-STORY-constituent-help-rent-and-care-have-no-case. A resident behind on rent or caring for someone ill visits office hours without a case on file, because cases open only for looking for work and pay under the minimum wage. Seen: in the cases that open at the official's office and the help the official gives.

**Cause.** Found in code: src/core2/modules/constituent-cases.ts problemOf (line 139) returns only looking-for-work or paid-under-minimum-wage (the Problem type, line 42); resolve (line 604) sends any other helped case to a workforce-office referral; the eviction and sick variants read the housing cases table and careNeedOf by household in src/director/arc-variant.ts (lines 415 and 459), not from a case.

**Fix.** Add the problems behind-on-rent (an open housing notice on the person's household, the housing cases table) and caring-for-someone-ill (careNeedOf over the household, src/core2/modules/health.ts) to problemOf and Problem, with their entries in src/core2/data/constituent-cases/problem-questions.json. In resolve, make help do what the problem needs through the engine that owns it (the housing engine's counsel and rent assistance for rent, the health engine for care) and never send these two to the workforce office. Have the two variants play from the case row. Resolve the stand-in in src/director/data/stopgaps.json. Cost: the check runs at office hours over residents with open notices or cases only, not over everyone.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: help must reach the housing or health engine and change a dollar or a care record. No dice: who brings a case follows severity and ties as the engine already does. Constituent cases are basic at early access (Oct 10 scope call). One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place (place and seed named), finds a case row by id for a resident with a served rent notice and one for a household member's care need, sees the office-hours scene play the matching variant from the case, and finds the official's help reaching the housing or health engine by record id; the stand-in is resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/constituent-cases.ts, src/core2/data/constituent-cases/problem-questions.json, src/director/arc-variant.ts, src/director/data/arc-variants.json, src/core2/modules/housing.ts, src/core2/modules/health.ts, src/director/data/stopgaps.json
