---
id: gov-redistricting-map-challenge
title: "A map challenge goes to the court the law names and judges weigh equal population and the Voting Rights Act as measured"
area: gov
kind: feature
priority: 3
size: M
status: claimed
claimed-by: claude/peaceful-ritchie-03780x
pr:
blocked-on:
after: gov-redistricting-who-draws
source: added with npm run pool -- add
claimed-at: 2026-10-20T00:42:11.877Z
---

**What.** A resident or group from an affected neighborhood files a challenge through a fileJudicialChallenge-style writer; federal maps go to the court courtFor returns (three judges where federal law requires), and each judge's considerations are measured: equal population, Gingles 1 (could a compact district hold a minority citizen voting-age majority, from the units), Gingles 2 and 3 (bloc voting from precinct results by neighborhood make-up, never from a person's race), the judge's outlook, and precedent rows. Remedy: a redraw ordered or a court-chosen plan.

**Rules.** No dice; one rule, all 56 places; no race, ethnicity or language field on any person; an effect is a read; the Political Process baseline and golden path come first, so this is not needed for early access play (docs/roadmap/political-process-baseline.md does not list redistricting; owner D-6 and Sept 28 #8 ask for it).

**Done when.** A drawn state's map is challenged by named residents, each judge's measured considerations and vote are recorded, and a remedy follows, by record id; map-challenge.test.ts.

**Files.** src/judiciary/, src/core2/modules/ (new)

**Notes.** Split Oct 19 (claude/peaceful-ritchie-03780x) from gov-redistricting-engine using the parts of docs/codex/specs/bank/b16-redistricting-vra.md (old-core file references; port only what is used). The spec's open question for the owner (how many plans a legislator sees: 3 to 4 ready-made plans is recommended) is built as the recommended answer unless he rules otherwise.

Measured findings built Oct 20 (claude/peaceful-ritchie-03780x), in src/core2/redistricting-challenge.ts: `populationFinding` (the plan's total deviation against the level's limit) and `gingles1` (for one protected group, Hispanic, Black, Asian or American Indian and Alaska Native, the most districts that could hold a citizen voting-age majority of the group within the population limit, found by the scored search, against the number the plan under challenge holds; `met` when the first could be drawn and the plan does not), with `groupMajorityDistricts`. src/core2/redistricting-challenge.test.ts on real packs: a lopsided plan is over the limit and an even one is not; a group that can form no majority (Black citizens in Vermont) fails the first condition; and Hispanic citizens in Texas could fill more majority districts than the even 38-district plan gives them (met). Limits: id order stands in for adjacency, so a group whose counties are not a run of ids (New Mexico's Hispanic counties) can read as achievable 0; real compactness needs block group geometry, which is not in the repository. Not built, and why: the second and third conditions (the group votes together; bloc voting by the majority defeats its choices) read precinct results by neighborhood make-up, which are not mapped to block groups yet; the filing writer, the three-judge panel and each judge's vote need a courts engine in the core, and "a second court engine" is on the spec's Must NOT build list while courts come after early access (AGENTS.md). So this item stays open until a core courts engine exists (a pool item for it belongs under the Courts line).
