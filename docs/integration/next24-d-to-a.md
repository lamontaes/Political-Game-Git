# NEXT24 D → A: one Personal routine mount

Recover D's frozen successor `1d44f37e69762fae5efeee3cf0eae73d5b07e1e4` before
applying its NEXT24 continuation. It already contains #204/#205; do not pick
those older donors again. Publication was explicitly requested, but auto-review
refused exporting source history; no remote receipt is claimed.

A alone applies this root mount in the existing `case "personal"` frame:

```tsx
import { PersonalRoutinePanel } from "./PersonalRoutinePanel";

<>
  <PersonalRoutinePanel
    world={session.world}
    personId={session.personId}
    onWorldChange={onWorldChange}
    onOpenEntity={openEntity}
    onTogglePin={togglePin}
  />
  <PersonalWorkspace /* keep existing props and record */ />
</>;
```

Normal route: menu → Personal → Who you are → Jobs, study and outings. No
top-level Work entry or public-office capability is required. The collapsed
native disclosure keeps the ordinary record quiet and is pointer/keyboard
operable. It reuses LifePathsPanel, PlacesWorkspace and the campaign-aware
registry; it owns no navigation history or persistence envelope.

Keep D's portable-World migration seam in `morning23-d-portable-save.md`. The
new journey is authored only for newly posted ordinary meetings; old lives
without an established leg remain unadapted, not silently teleported. There is
no modeled fare/access purchase for this bounded local route: disclose that,
do not fake a funds test or zero-price quote. Existing access-refusal proofs
remain applicable. Final player-facing visual acceptance remains with the owner.

Verified return: `codex/next24-d` at
`4e85ef896bc83b9272cc4f4a2a8e217f8c5014b5`; later fixture-only commits preserve
product checkpoint `b0d0e372`. Actual isolated A `f2dded28` + D root proof is
`6b19111ced985170f115ce9a4c3d58e2217feaf5` on `codex/next24-d-proof`.
Run `46e75edd-96f7-4854-9d8c-5219bee13921`: two browser tests passed, pointer
and keyboard, at 1440×900 and 1200×720; saved World deltas prove one pay per
interval and arrival before attendance. Review viewer: `http://127.0.0.1:5218/`.

Full bounded suite: 4,516 passed, two skipped (312 files), using two workers and
30-second default allowance; all remaining production/source/art gates passed.
The earlier default validation failure and exact commands remain recorded in
the active NEXT24 D plan, not relabeled green. Reviewed screenshots are readable
but the expanded institution browser is dense. Human acceptance and a fresh
current-main composition check remain pending. Remote upload still needs exact
approval; do not claim this local return was published.
