# NEXT24 D → A: one Personal routine mount

Recover D's frozen successor `1d44f37e69762fae5efeee3cf0eae73d5b07e1e4` before
applying its NEXT24 continuation. It already contains #204/#205; do not pick
those older donors again. The earlier publication refusal is superseded by the
owner's explicit branch/destination authorization. PR #221 publishes this work
on `codex/morning23-d`; do not merge its older root wholesale.

A alone applies this root mount in the existing `case "personal"` frame:

```tsx
import { PersonalRoutinePanel } from "./PersonalRoutinePanel";

<>
  {view.section !== "finances" && (
    <PersonalRoutinePanel
      world={session.world}
      personId={session.personId}
      onWorldChange={onWorldChange}
      onOpenEntity={openEntity}
      onTogglePin={togglePin}
    />
  )}
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

## Current tested net return — POST-HANDOFF26

Published PR: https://github.com/lamontaes/Political-Game-Git/pull/221.
Initial recovered source was `c5e3b548aa94549d04403a414f3c7d69fe1f06c9`;
tested outcome successor is `6a3a4d98d848de99749e39ab747d45f07f68d21c`.
The latter changes no simulation file: elapsed duration remains exact and is
also readable in days/hours, with recorded outcome categories on separate lines.

Actual current-main `215b3e90d163ed3344dbbd36bfaa621501bd67f8` + D proof:
`33d7f28bdce5201b78a92b650f159b51e8a25680`, clean in
`/private/tmp/pg-posthandoff26-d-proof`. Run
`730f5170-df9f-4565-bedb-0130593c7e0c`: two real pointer/keyboard cases passed at
1440×900 and 1200×720, with Keep/reload and saved synthetic World deltas. Dedicated
viewer: http://127.0.0.1:5220/. The older 5218 viewer stays untouched.

A's only net root mount is the snippet above, preserving **all current
PersonalWorkspace props**. Current navigation sets `section: "identity"`:
`!view.section` is incorrect. An earlier isolated run exposed that mistake and
is preserved at `a48b9e3c` / run `e96ce8f0-dfe9-4416-84c2-106f48c0881b`.
The corrected mount excludes finances only; no NPC or root-save edits are needed.

Source reconciliation is additive: preserve current main's school corridor,
school episode and covered-shift venue gaps; insert the seven-line
`ordinary-life:to-meeting-room` null-scene journey binding alongside them.
Regenerate prose inventory from A's actual combined tree; do not take D's older
generated corpus over current main's school/opening context. PR #221 is not a
directly clean merge yet; A owns this bounded reconciliation and root landing.
D-only hosted browser tests do not exercise an unmounted Personal root; keep
their assertions, and validate the mounted combined head rather than skipping
the route or claiming those checks green.

Latest D checks: 32 routine/venue/Places/study/ordinary-work tests; 42 live prose
inventory tests; typecheck, lint, release check, art validation/inventory/QA all
passed. Initial published-head GitHub repository check passed; browser shards
were pending at inspection. Earlier full suite and production/source gates are
historical evidence at their recorded source, not relabeled as this new head.
Complete receipt: `docs/plans/completed/next24-d-personal-route.md`.
Human acceptance is still pending; reviewed outcome screenshots are readable,
and the reused expanded institution browser remains dense. No main merge was
performed and no combined-route correctness defect is currently identified.

## DELIVERY28 — additional current-main net, not another root

Refreshed main: `2d154752aa38c9b94227b53ecfffb2db58081f9a` (#227).
A already authored the newer composed receiver
`42b76858f1cf0f4fd862dcf3baf67e97f030f3fd`, including D's Personal/identity
mount and idempotent portable migration. Preserve that root's exact
PersonalWorkspace props. The mount above is unchanged; do not replace this
newer composition with an older donor or mount it again.

D's only additional source net is
`9c4c8331b333641ad707f56902c6fca20bc581ad` atop A's frozen receiver:
the life-content13 Places fixture and its plan. No production, root, migration,
clock, art or outcome-presentation file changes. The former positive fixture
had no recorded current location. The repair proves missing-origin refusal,
unchanged serialized World and retry across reload, then gives the positive
case an explicit already-at-workplace record. Completion retries are unchanged;
no arrival is invented. A explicitly assigned this fixture to D.

The exact source net is published as
`docs/integration/delivery28-d-fixture.patch` on the authorized #221 branch,
without publishing A's unlanded root as D source. Apply only this patch or receive
9c4c8331 ancestry if already composing b219. Never replay #204/#205. Reverse
apply-check against frozen 9c4c8331 passed.

Prior checks on that exact source: 64 focused tests, typecheck, lint, art
validation/inventory/QA passed (1,886 inventory items; existing duplicate-hash
warnings). Baseline reproduction was 20 passed / one failed, with the truthful
missing-location refusal. The first sparse typecheck failed for omitted source
data; the complete retry passed. An environment restart removed temporary
worktrees and interrupted browser run befaed04; it is not claimed passed.
The frozen Git source survives and is recovered in
`/private/tmp/pg-delivery28-d-recovered`. Final fresh proof is recorded in
`docs/plans/completed/delivery28-d-current-main.md`.

No main merge, installed-delivery claim, independent review clearance or human
visual acceptance is made by this return. #221's b219 repository check passed;
its unmounted hosted browser checks failed. They are not relabeled green or
weakened. A owns final current composition, publication and landing.
