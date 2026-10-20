---
id: governor-clemency-computer-governors
title: "Computer governors act on clemency petitions: today only a player governor can commute a sentence"
area: gov
kind: feature
priority: 3
size: M
status: in-pr
claimed-by: claude/computer-governor-clemency
pr: #5536
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-20T04:52:41.834Z
---

**What.** A governor who is not the player never takes up a prisoner's petition, so commuting a sentence is reachable only by a player governor, and no screen offers it. A computer governor should weigh the weekly petition from their traits, the petitioner's record, the victim's standing and the public view, and grant or refuse it.

**Rules.** No dice: the governor's traits, the record and the public's views decide. Wire to the world: a granted petition frees a named person and ends their prison term on the records the housing and jobs engines read. One rule for all 56 places.

**Done when.** In a played world (buildBenchWorld) in a drawn place and seed, a computer governor takes up a petition and grants or refuses it by their recorded reasons, a granted one frees the named person, and a test in src/core2 names the petition record id and fails when no governor ever acts.

**Files.** src/core2/modules/office-governor.ts, src/core2/office-day-state.ts

**Notes.** TODO
