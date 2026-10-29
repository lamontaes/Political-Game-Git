---
id: campaigns-local-platform-budget-lines
title: "A local candidate's platform includes the body's budget lines, so a town seat in a state that preempts every policy question still has issues to campaign on"
area: elections
lead: laws-effects
kind: feature
priority: 2
size: M
status: done
claimed-by: claude/local-platform-budget-lines
pr: #6322
blocked-on: laws-filing-positions-are-the-seats-own-issues
source: laws-and-effects lead, Oct 27 (the filing-positions gate)
claimed-at: 2026-10-27T11:31:42.599Z
---

**What.** With `laws-filing-positions-are-the-seats-own-issues`, a seat offers only the policy questions its own government may decide. In a state whose law lets its towns act on none of the 54 platform questions, a council or mayor seat offers none. In Harriman, Tennessee (4732520, seed `aa3bb7331dbb8615`) the council and mayor list 0 positions. A candidate there has an empty platform, and `src/core2/campaign-day.ts:321` opens the campaign event only for a platform with a position, so neither the player nor a computer candidate can hold an event. Real town races run on the town's own budget (police, roads, parks, schools) as much as on ordinances. The body's own budget lines, which `budgetLineStakes` already weighs member by member, should be positions a local candidate can take.

**Rules.** Wire to the world: a budget position is read where the body votes its budget (`councilBudget` in `src/core2/modules/legislature.ts`) and where voters weigh the race. One rule, all 56 places: the lines are the body's own budget records, never a list in code. This is a game, not a spreadsheet: a position is a choice the candidate makes once at filing, not a new form.

**Done when.** In a drawn place built with buildBenchWorld whose state lets its towns decide none of the platform questions, a council contest lists the council's own budget lines as positions, a computer candidate's filed platform holds at least one, the campaign event opens for that candidate, and a voter's choice in the race reads it by record id; a test names the place and seed.

**Time box.** 3 hours, the laws-and-effects lead or a Sonnet helper.

**Files.** src/core2/contest-positions.ts, src/core2/campaign-stances.ts, src/core2/campaign-day.ts, src/core2/modules/legislature.ts

**Notes.** Filed by the laws-and-effects lead, Oct 27, from the filing-positions PR's gate, where the fresh draw was Harriman, Tennessee.
