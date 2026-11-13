---
id: core-past-votes-only-on-questions-the-chamber-decides
title: 'A county commissioner''s record lists votes on "Raise federal minimum wage" and "Admit more immigrants": the opening''s past roll calls take members'' campaign questions whatever the chamber''s level'
area: core
kind: bug
priority: 2
size: S
status: claimed
standard: 2
claimed-by: claude/p2-past-votes-by-level
pr:
after:
blocked-on:
lead: play-first
model: sonnet
effort: low
root: none
source: Playtester P2, Nov 13 (French Island, Wisconsin, seed 49f52639-1873-49db-9500-bac35d6dc22b)
---

**What.** In an Advanced start in French Island, Wisconsin (seed 49f52639-1873-49db-9500-bac35d6dc22b) as La Crosse County Commissioner Anika Emerson, Politics → Elections → Your record in office → Votes you cast lists "Forgive student loans · April 26, 2023", "Raise federal minimum wage · October 15, 2023", "Admit more immigrants · March 11, 2024" and "Limit power plant carbon · November 12, 2024", each "You voted for it · it passed". A county board never decides those. The same happens to state legislatures: the Utah House "voted" on admitting more immigrants and the Kentucky Senate on the federal minimum wage. Seen: an officeholder's past votes are on questions their own body decides.

**Cause.** Found in code: `buildPriorTerms` in `src/core2/past-laws.ts` (line 283) puts the questions each member ran on ahead of the catalog's questions for the chamber's level, and never checks that the chamber's level can decide them. A local or state winner's campaign promises can name federal questions, so they become that chamber's past roll calls.

**Fix.** The members' own questions are kept only when the catalog lets the chamber's level decide them (the same `CATALOG_QUESTIONS[catalogLevel(level)]` list the chamber's other questions come from). A drawn-place test checks every local and state past vote against the catalog's levels.

**Time box.** 1 hour

**Rules.** One rule, all 56 places: the filter is the catalog's level for every chamber in every place, never a named question. Ask why: each past vote's question is one its body could have decided.

**Done when.** `src/core2/past-votes-by-level.test.ts` passes in two drawn places with past votes, and a second session sees, on the bench on main, a drawn Advanced start as a county or town officeholder whose Politics → Elections → Votes you cast lists no federal question.

**Waits on.** Nothing.

**Files.** src/core2/past-laws.ts, src/core2/past-votes-by-level.test.ts
