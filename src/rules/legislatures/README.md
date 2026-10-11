# P14 legislature and council — RULES-2 contract

Owner-approved REVIEW 25; stack on `pool/P14-elections`. Own
`src/rules/legislatures/` and its release declaration. Old engines unchanged.

Plan: lift inventory RULE/KEEP vote requirements (including quorum and override
denominators), committee assignment, sitting calendars, executive action windows
and override counts into pure functions of caller-selected facts. Exercise local,
state and federal rule inputs together across all 56 identities, against the
unchanged legacy rule functions. Readers and decisions are caller/port boundaries;
golden fixtures may supply those readers' facts while retaining the original rule
calculation as the oracle. Preserve suspected bugs and register every shortcut.

Separate finisher and CTO merge. Courts/press parked. Continue to authorized
`pool/P14-laws`, then `pool/P14-economy`, without waiting for review.

Model: GPT-6 (Codex); exact runtime variant/configured effort not exposed;
repository default medium. Start: 2026-10-11 00:38 UTC. Usage/cost not exposed.

## Lift and boundary

146 KEEP lines fully lifted: required vote arithmetic (26), committee rosters and
recorded seating order (56), and next sitting date (64). 139 lines partially
lifted: executive action windows (56) and override count (83). Supplied thresholds
serve quorum, passage and veto override without changing the denominator or floor.
Local council profiles are included where a recorded government unit resolves one;
missing state-level packs in D.C. and territories remain absent. Federal inputs
and generic committee/sitting fixtures run against every jurisdiction identity.

Golden window/count tests supply selected pack, action, adjournment, seated chamber
and predicted disposition facts at legacy reader boundaries. They do not mock the
original deadline loops, override counting or required-vote calculation. These
tests establish equivalence of the lifted rule, not equivalence of the unported
readers, decision evaluator or whole World integration.

CTO stopgaps preserved: zero-member fraction cap; 1e-9 vote tolerance; authored
round-robin committee assignment; two-traversal committee guard; four-year sitting
search; business windows omit holidays; after-adjournment inaction outcome is null.
Each has exact core2 fields and a source marker. Legacy council quorum validation,
override deadline lookup and remaining procedural orchestration are still unported;
the pure overrideDeadline wrapper is PLUMBING in the inventory and was excluded.

## Validation / hand-off

283 tests in two files pass across all 56 identities. Random draw AK, seed
`rules2-legislatures-20261011`. Scoped ESLint, Prettier, diff and zero-dice checks
pass. Owned TypeScript diagnostics zero; imported legacy graph retains the 101
baseline diagnostics. Main smoke evidence is in #3946; no new-core bench exists
on main. RULES-2 implementation interval 2026-10-11 00:38–00:43 UTC (~5 minutes).
Model/effort above; usage/cost not exposed. Next: the authorized laws branch.

## Complete scoped KEEP disposition

`KEEP-DISPOSITION.md` and `keep-disposition.json` account for every one of the
138 legislature/council inventory KEEP functions. Each whole-function blocker
names its specific legacy World effects, research closure, private owning
pipeline or English/old evaluator contract. Partial windows and overrides keep
their destinations. This does not reclassify KEEP or claim future adapters are
impossible.

The continuation adds agenda/caucus selection, joint-assembly candidates,
positioned bill answers, chamber/floor progression, session gates, elected-member
validation, authored disposition assignment, council-item routing and seat
classification, modal council shares and review/general-election calendars.
Private supporting validation and chamber sequence lookup are not counted as
KEEP functions. New CTO registrations preserve pending/unplayed council items,
noninteger/negative authored vote counts, weekday-only congressional review and
the district fallback for unknown seat composition. No legacy engine is edited.
Golden comparisons exercise every new rule across all 56 identities; real state
packs are used where present without inventing territorial legislatures.
