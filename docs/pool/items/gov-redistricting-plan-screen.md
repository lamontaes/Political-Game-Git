---
id: gov-redistricting-plan-screen
title: "A plan-comparison screen on the political map for a player who sits where maps are drawn"
area: play
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
after: gov-redistricting-who-draws
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:47:20.088Z
---

**What.** A plan-comparison view on the political map: per district, people, deviation, past vote, neighborhood make-up as district totals, and which incumbents are paired, so a player who sits where maps are drawn can compare the printed plans and bargain over them through the existing vote and negotiation surfaces. Neighborhood make-up is shown only as district totals, never on a person.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** A council player in a drawn town sees the ward plans and is paired with a colleague under one; a screenshot named in the PR body.

**Files.** src/bench/, src/maps/political-map-model.ts

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.

Rows built Oct 20 (claude/peaceful-ritchie-03780x), in src/core2/redistricting-compare.ts: `planRows` and `comparePlans` return, per printed plan and district, the people, the signed deviation from equal, the last vote in the units now drawn together, the citizen voting-age people and minority share as district totals, and the sitting members whose homes are in it (person ids), with the count of members paired; record data only, no words (the screen supplies those through the English engine and control names). src/core2/redistricting-compare.test.ts, on real New Mexico block groups: the rows add to the state's people, every district is within one percent of equal in the even plan, and two members sharing a block group are paired in every plan. Not built: the screen itself. It needs an endpoint in src/bench (a server route beside the campaign one), a sheet in src/bench/play.mjs and a screenshot from a played game in a drawn town, with the plans built from the live world's members and votes (the plan builder's live inputs: votes by block group and members' homes) and a ward plan for a town on block groups, none of which exist yet. Done when stays: a council player in a drawn town sees the ward plans and is paired with a colleague under one.
