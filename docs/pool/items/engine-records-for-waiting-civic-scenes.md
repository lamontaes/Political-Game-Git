---
id: engine-records-for-waiting-civic-scenes
title: "The civic and world records four situation types wait on: an incident, a vote promised, an eviction notice served"
area: world
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: laws-effects
source: added with npm run pool -- add
---

**What.** Four situation types wait on records no engine writes in a played year (same measured year as engine-records-for-waiting-life-scenes). rescue: no incident record with someone present (public safety writes none in the year). accusation: no incident at work or school. vote-confirmed: no record of a member promising a vote before the floor (vote-asked fires from a trade amendment, but the promise kept or broken is not recorded). eviction-notice: the housing engine records the removal (housing.eviction, its topic the landlord organization) but no notice served before it, so the landlord and tenant cannot talk terms while the home can still be kept. Each owning engine writes its record from its own causes; the director lead adds the match.

**Time box.** 4 hours, Sonnet worker or the laws-effects lead.

**Rules.** Simulate it, don't ask (owner, Oct 24). No dice. Sliding scales and causes: an incident follows from a hazard or crime record, never a monthly chance. One rule, all 56 places.

**Done when.** For each record: a one-year buildBenchWorld run in a drawn place (place and seed printed) writes at least one, named by record id, and the reach report (src/director/reach.ts) shows its waiting type fired from it.

**Files.** src/core2/modules/public-safety.ts, src/core2/modules/legislature.ts, src/core2/modules/housing.ts, src/director/data/situation-types.json

**Notes.** Oct 27, 23:50 UTC, director lead: housing now records the notice itself. When a landlord serves notice, `src/core2/modules/housing.ts` puts a case in its `cases` table at stage `notice`, with `noticeAt`, `householdId` and `landlordId`. Only the removal emits `housing.eviction`. A one-year buildBenchWorld run (two-level, no player acting) wrote no case at all in McKee, Pennsylvania (seed dd2ab091a4575bf2188bee7f2baded1038a2772286f4a80f13e950f917ca3429) or in Elbridge, New York (seed c91b2035290cfbe8dafb43fe79c23e2d6212b89e8fe16f5499a29d4a6797dd63). So eviction-notice still has no record to fire from in play. The landlord is also an organization (`SG-WORLD-housing-landlord`), so the scene's landlord role has no person to cast until one is named for it. The director's match is a few lines once a notice case reaches a full household in a played year.
