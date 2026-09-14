# REST37-M — ordinary municipal route

Owner: Cursor successor for existing M / MUNI-PLAY1. Isolated branch
`cursor/rest37-m-municipal-route-1925`. A remains sole integrator. Recovered
Fable UI / `src/player/MunicipalWorkspace.tsx` untouched.

## Ownership check (brief)

- Public `origin/main` at start: `f22fd314e72bec0440044026ccdfd99e7a67600d`.
- Published municipal recovery leads (`codex/92i-municipal-governance-implementation`,
  `codex/muni-play1`, `cursor/municipal12-restore-cf91`, `cursor/municipal11-add9`)
  have empty diffs against that main; they are already received, not a newer
  unpublished tree.
- No running writer on those municipal branches. Idle Municipal11/12 cloud
  sessions are stopped and were not mutating this surface. L (`#237` bargaining)
  and X (executive entry) are other files.
- Current generated registry still reports 144 inventory governments and
  **0 admitted council packs**. That is a procedure-admission result, not a
  missing directory.

## What the player can do

On Charlottesville (enacted charter + Code of Virginia § 15.2-1427):

1. A resident attends an authored public sitting. Time and
   `municipal.public-meeting-attended` history are recorded. Attendance is not a
   seat.
2. A seated council member appoints the City Manager under compiled Charter
   § 5(e). The office is a canonical organization participation and
   `municipal.manager-appointed` event.
3. A visitor, a second appointment, and the same write after save/reload all
   refuse with the world unchanged.

## Named ordinance hold (not a global hold)

Council ordinance introduction and floor votes stay closed because
`municipalRulePackFor` still cannot admit a pack. For Charlottesville the
exact compiled gaps are:

- **introduction** — no instrument read states who may introduce an ordinance
  (Charlottesville Charter and Code of Virginia § 15.2-1427 are silent).
- **readings** — no instrument read requires a number of readings.
- **what happens after adoption** — retrieved charter sections do not establish
  post-adoption mayoral presentment; silence is not treated as inapplicable.

Richmond and Carson City remain blocked by those cities' own remaining cells
plus **hearing and notice enforcement**: sourced hearing/publication text still
has no canonical procedure adapter (`publicHearing !== null` refuses
progression). Those are field-specific, not a 50-state research restart.

`introduceMunicipalOrdinance` exists and will use `introduceMeasure` when a pack
is actually admitted. It currently returns the named refusal.

## Adapter for A

`src/presentation/municipal-governing.ts` — feature-local projection and
writers. Mount from UI-core / FABLE-UI; do not import it into the recovered
Fable tree from this branch.

Focused proof: `src/simulation/municipal-public-work.test.ts` (ordinary route)
and `src/presentation/municipal-governing.test.ts` (adapter).
