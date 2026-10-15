---
id: gov-powers-by-level
title: "Powers by level: what each government may legislate, tax and spend on"
area: gov
kind: feature
priority: 2
status: in-pr
claimed-by: claude/gov-powers-verify
pr: #4528
blocked-on:
milestone:
source: "overnight pool item 8"
claimed-at: 2026-10-15T23:40:06.726Z
---

**What.** Nothing checks what a town, a county, a state or Congress may legislate, tax and spend on, so a council can pass a bill the state would forbid. Build the powers per place from data (home rule or Dillon's rule, each state's grant to counties and towns, federal enumerated powers) and have the authority check read it before a bill is introduced and the executive read it before an order. A refused bill keeps its reason. The player would notice that some proposals are not available to a small town and why, and that a state or federal body can do what a town cannot.

**Rules.** One rule, all 56 places: powers are data for all 56 places and no state or city is named in logic; An effect is a read, not a record: `policy-authority.ts` and the introduction check read the powers at the moment a bill is introduced or an order issued; Ask why: a refused bill records the power row that refused it; Research before building: grants and rules cite state constitutions and statutes, tagged SOURCED or ESTIMATED with spread; Replace, never layer: `policy-authority.ts` stand-ins are replaced, not left beside the new data; No hand-written player text: the refusal is worded by the English engine from the record; This is a game, not a spreadsheet: no new form or approval step for the player; the refusal appears only when the proposal is outside the body's powers.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a bill outside a body's powers is refused for its recorded reason (name the bill, body and power row), the same bill is accepted at the level that holds the power, and `src/core2/policy-authority.test.ts` covers the refusal. The owner plays it: tries to propose a state-level tax as a town council member and is told, in words, that the town has no such power.

**Files.** src/core2/policy-authority.ts, src/core2/modules/legislature.ts, src/core2/modules/executive.ts, src/core2/data/legislature/series-powers.json

**Notes.** Rewritten to the quality gate 2026-10-15.
