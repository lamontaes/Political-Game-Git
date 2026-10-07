# Places and Transit use square fields and offer cards

Before: Measured in the before capture: Places offers and Transit fields have rounded edges.

After: Measured in the after capture: Places titles use the shared title font, and offer cards and Transit fields have square edges.

Publication remains held until Session 1 passes the shell prerequisite.

## Replacement and proof

Replaces: `src/player/PlacesWorkspace.css:1` changes the existing Places rules in place. `src/player/TransitWorkspace.css:12` replaces rounded field, fieldset and result styling. These are measured CSS changes. `src/player/TransitWorkspace.tsx:70` removes the redundant developer explanation; the existing filing instructions remain. The diff contains no travel or appropriation action-handler changes; unchanged behavior is inferred from that source boundary, not a new gameplay claim.

Built on Session 2's published shell foundation. Session 9 owns the Personal split-record extraction.

Places before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-places-transit/docs/codex/session3-evidence/places-transit/places-before.png)

Places after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-places-transit/docs/codex/session3-evidence/places-transit/places-after.png)

Transit before:

![Before](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-places-transit/docs/codex/session3-evidence/places-transit/transit-before.png)

Transit after:

![After](https://raw.githubusercontent.com/lamontaes/Political-Game-Git/codex/session3-places-transit/docs/codex/session3-evidence/places-transit/transit-after.png)

## Validation and next step

Measured local checks: full typecheck, changed-file ESLint and Prettier, zero-dice, committed release declaration range and merge-tree against current main pass. The composed browser cases pass (2/2); Calendar and Campaign unit tests pass (6/6). Measured preserved clean-main failure: the original three-year run exhausted Node’s 4 GiB heap before completing its first year (about 902 seconds; exit 128). No speed comparison is established. Further year timing belongs to Session 5 under the CTO instruction. Measured 30-day opening: the canonical observer advances from January 5 to February 4, 2026, using the same random-place seed and Scarville locality. The receipt names tested source `203d4be05dca287af5d75088d6c110a8503a11e6`. The screen candidate has no changes in `src/simulation`, `src/presentation` or `data`; unchanged simulation behavior is inferred from that source boundary. The ordinary new-life walk uses Scarville, Iowa, seed `session3-kit13-20261005`, at 1920×1080. Office and Transit use the existing supplied recorded-member term; it does not establish ordinary election reachability. The coordinator retains merge authority.
