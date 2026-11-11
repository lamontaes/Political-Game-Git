---
id: elections-puerto-rico-legislature-election-year
title: "Puerto Rico's legislature is seated as if elected in 2022, though it votes with the presidential cycle (2020, 2024)"
area: elections
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: claude/pool-elections-puerto-rico-legislature-election-year
pr: #8619
blocked-on:
source: governing lead, Nov 1 (elections-past-race-votes-from-electorate)
lead: governing
after:
standard: 2
model: sonnet
effort: medium
root: rc9-place-facts-one-default
checked: fable 2026-11-10
claimed-at: 2026-11-11T05:20:15.467Z
---

**What.** Puerto Rico's legislature is seated as if elected in 2022, though it votes with the presidential cycle (2020, 2024). In Añasco, Puerto Rico (7202680, seed plv-2 draw 32) and Aceitunas, Puerto Rico (7200186), every seat of both chambers of the Legislative Assembly holds a term elected on 2022-11-08, so the opening's paper reports a 2022 legislative election and its turnout uses the off-year ratio. Puerto Rico's general elections, legislature included, fall every four years with the U.S. presidential election. The cycle must be read from data, not a default.

**Cause.** Found in code: `src/core2/offices-state.ts` `seatElectionYear` (line 365) takes a four-year, non-staggered chamber's year from `offered(...)` (line 323), which reads `data/research/elections/filing-requirements.json`; Puerto Rico's `stateLegislative` row there has `offeredIn2026` false and no `nextRegularElection`, so `offered` falls back to the 2026 anchor (2026, 2030, so the last election reads 2022). `data/research/offices/state-offices.json` already says "Quadrennial general elections in presidential years (2024, 2028)" under Puerto Rico's `stateElectionYears`.

**Fix.** Make the legislative cycle for a chamber with no 2026 election come from the state-offices research (its election-years pattern and next regular election) when the filing research gives no next year, so Puerto Rico's seats read 2024 then 2028, and add a test over every chamber in data that its seats' last election year falls on its own cycle.

**Time box.** 3 hours for one sonnet session.

**Rules.** One rule, all 56 places: the cycle is read from each chamber's data (its term length and the year of its last election), never named for Puerto Rico in logic. Estimate, never UNKNOWN: the last election year carries its source.

**Done when.** A second session starts a New Game in a drawn Puerto Rico place (place and seed in the PR body) and sees every legislature seat's last election as 2024-11-05 and its next as 2028-11-07, by seat id, with the opening's paper reporting 2024. A test checks every chamber in data that its seats' last election year falls on its own cycle; the other 55 places' chamber years are unchanged or corrected with a cited reason.

**Waits on.** Nothing.

**Files.** src/core2/offices-state.ts, data/research/offices/state-offices.json, data/research/elections/filing-requirements.json

**Notes.** Found while checking past race totals; the totals themselves are right for the year the record gives.
