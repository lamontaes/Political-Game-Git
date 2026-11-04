---
id: gov-body-law-jurisdiction
title: "Each bill uses the government of its own body"
area: laws
kind: bug
priority: 2
size: S
status: claimed
claimed-by: lane-2/body-law-jurisdiction
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-11-04T13:33:03.532Z
---

**What.** Implement step2 of the existing world-governing U2 spec: the shared law-jurisdiction reader takes an office's actual state, county, township or place, and billJurisdiction uses it. The current reader assigns every state bill to the played state and looks up county units by a place-only index. The broader every-state-and-town parent remains unfinished.

**Rules.** One engine per mechanic: use the existing office rows, government-unit reader and legislature. One rule, all 56 places: preserve municipio and no-county-law fallbacks from actual chain data, without named-place branches. Wire to the world: normal bills and enacted rows read the actual body key. Record the previously agreed U2 seam in docs/lanes/agreements/1-2.md before source edits. No voting, calendars, core state, offices module or screens change.

**Done when.** A generated all-module year drawn from all 56 names its town, replay, actual body, bill, roll call and enacted law whose jurisdiction agrees with that body's real government. Existing outside-state office rows resolve to their own state, and a multi-county body's law key comes from its own unit. Pure edge checks preserve township, federal, municipio and city fallbacks; the original readers fail their regression. Fresh New Game passes and four serial years remain within 20 percent of the same-host base, with world-record differences explained. The every-state-and-town parent remains unfinished.

**Files.** src/core2/laws-in-force.ts; src/core2/modules/legislature.ts jurisdiction readers only; src/core2/body-jurisdiction.test.ts; lane agreement and proof

**Notes.** Existing gov-every-state-and-town-governs Nov1 20:00 notes and world-governing-u2-spec-2026-11-01 section6 agree the billJurisdiction/countyOfBody seam; step2 specifies this unit. Searched pool for body jurisdiction, officeLawJurisdiction and countyOfBody; the merged draft-value reader addresses amounts, not body identity. Bound this child to step2; U2 remaining steps and U3/U4 stay with the parent. Two-hour implementation time box, serial verification follows.
