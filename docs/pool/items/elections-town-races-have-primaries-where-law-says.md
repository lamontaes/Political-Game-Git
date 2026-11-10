---
id: elections-town-races-have-primaries-where-law-says
title: "A town race has a primary where the state's municipal law holds one, from data by state"
area: elections
lead: elections
kind: bug
priority: 2
size: M
status: open
blocked-on: research access (the session's network blocks the state statute sites)
source: Elections, from the Nov 8 playtest check (PR #7721, point C11)
---

**What.** Every town or city race in every state is given no primary: `municipal()` in `src/core2/elections-calendar.ts` returns `primaryDate: null`, so the clerk says "No primary, just the one election" (`src/director/filing-visit.ts`) and a race that has one is grouped as at-large where it should not be (`elections.ts` at-large grouping reads the missing date). Connecticut's own filing record names a September municipal primary for partisan town elections (`data/research/elections/filing-requirements.json`, US-CT municipalOffice: filing deadline "about 63 days before the September primary"). Other states hold municipal primaries too (partisan city elections, nonpartisan top-two primaries).

**Rules.** One rule, all 56 places: the municipal primary rule lives in data by state (whether municipal elections have one, its date rule and where it applies), each row SOURCED from the statute or ESTIMATED with a spread, never a name in logic. No dice: a primary is held only when more candidates file than the party or ballot rule allows through, as in the voting engine's primary already. Estimate, never UNKNOWN: a state whose rule is not read starts from "no primary" marked ESTIMATED with the reason.

**Done when.** In a played year at three places drawn from all 56 (names and seeds printed), including Connecticut, the town's contest record carries the primary date the state's data gives where the state holds one, the clerk's visit says the primary date instead of "no primary", and a decided town race with more filers than the rule allows shows the primary result by record id; a state without a municipal primary still reads "no primary".

**Files.** src/core2/elections-calendar.ts, src/core2/elections.ts, data/research/elections/municipal-primary-rules.json (new, with citations), src/director/filing-visit.ts

**Notes.** Elections, Nov 8: not guessed in code. The date rules need the statutes read; the research helper could not fetch cga.ct.gov, ecode360.com or ballotpedia.org from this session. Ask for those hosts to be allowed, then fill the table state by state.

Nov 10, Fable audit: the audit of Nov 9 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, root cause 9, "Place facts are one default stretched over 56 places") names this defect again, read in the code and not measured in a played place: "No town race anywhere has a primary (`src/core2/elections-calendar.ts:410`)." Confirmed on main, Nov 10: `municipal()` (line 387) still returns `primaryDate: null` at line 410 for every town in every state, and `data/research/elections/municipal-primary-rules.json` does not exist yet. The audit gives no place, seed or count for this one; it lists it beside the town election day and the default town board as the same root cause (see `elections-town-election-day-comes-from-the-place` and `gov-town-body-default-is-one-board-for-a-whole-state`).
