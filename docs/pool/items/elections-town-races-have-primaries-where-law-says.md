---
id: elections-town-races-have-primaries-where-law-says
title: "A town race has a primary where the state's municipal law holds one, from data by state"
area: elections
lead: elections
kind: bug
priority: 2
size: M
status: dropped
blocked-on: research access (the session's network blocks the state statute sites)
source: Elections, from the Nov 8 playtest check (PR #7721, point C11)
after:
standard: 2
model: opus
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
---

**What.** Every town or city race in every state is given no primary, though some states hold municipal primaries. `municipal()` in the elections calendar returns `primaryDate: null`, so the clerk says "No primary, just the one election" and a race that has one is grouped as at-large where it should not be. Connecticut's own filing record names a September municipal primary for partisan town elections (`data/research/elections/filing-requirements.json`, US-CT municipalOffice: filing deadline "about 63 days before the September primary"). Other states hold municipal primaries too (partisan city elections, nonpartisan top-two primaries). The rule lives in data by state, read by the voting engine, which holds the primary only when more candidates file than the rule allows.

**Cause.** Found in code: `src/core2/elections-calendar.ts` `municipal` (line 387) returns `primaryDate: null` (line 410) for every municipal race; the clerk line "No primary, just the one election" is in `src/director/filing-visit.ts`. `data/research/elections/municipal-primary-rules.json` does not exist yet.

**Fix.** Add per-state municipal primary rule rows (whether municipal elections have one, the date rule and where it applies), each SOURCED from the statute or ESTIMATED with a spread, read in `municipal()`, and let the voting engine hold the primary only when more candidates file than the party or ballot rule allows. A state whose rule is not read starts from "no primary" marked ESTIMATED with the reason.

**Time box.** 8 hours for one opus session.

**Rules.** One rule, all 56 places: the municipal primary rule lives in data by state, never a name in logic. No dice: a primary is held only when more candidates file than the party or ballot rule allows through, as in the voting engine's primary already. Estimate, never UNKNOWN. Research before building: the date rules need the statutes read.

**Done when.** A second session plays a year at three places drawn from all 56 (names and seeds printed), including Connecticut, and sees the town's contest record carry the primary date the state's data gives where the state holds one, the clerk's visit say the primary date instead of "no primary", and a decided town race with more filers than the rule allows show the primary result by record id. A state without a municipal primary still reads "no primary".

**Waits on.** Network access to the state statute sites (the item's blocked-on).

**Files.** src/core2/elections-calendar.ts, src/core2/modules/elections.ts, data/research/elections/municipal-primary-rules.json (new), src/director/filing-visit.ts, data/research/elections/filing-requirements.json

**Notes.** Elections, Nov 8: not guessed in code. The date rules need the statutes read; the research helper could not fetch cga.ct.gov, ecode360.com or ballotpedia.org from this session. Ask for those hosts to be allowed, then fill the table state by state.

Nov 10, Fable audit: the audit of Nov 9 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, root cause 9, "Place facts are one default stretched over 56 places") names this defect again, read in the code and not measured in a played place: "No town race anywhere has a primary (`src/core2/elections-calendar.ts:410`)." Confirmed on main, Nov 10: `municipal()` (line 387) still returns `primaryDate: null` at line 410 for every town in every state, and `data/research/elections/municipal-primary-rules.json` does not exist yet. The audit gives no place, seed or count for this one; it lists it beside the town election day and the default town board as the same root cause (see `elections-town-election-day-comes-from-the-place` and `gov-town-body-default-is-one-board-for-a-whole-state`).

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would add municipal primaries from each state's statutes (network research); the clerk's "no primary" line is the only difference and no ruling asks for it.
