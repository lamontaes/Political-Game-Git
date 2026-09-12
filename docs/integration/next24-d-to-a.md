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
