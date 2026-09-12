# County provider handoff

The existing accepted `data/source/counties/` production corpus now reaches the
same `lifePlaceSearch`, `lifePlaceByKey` and `lifePlaceByJurisdictionId` interfaces
as places. All 3,222 county and county-equivalent identities retain their exact
source names and distinct `county:{GEOID}` keys. County identity uses
`national-county:{GEOID}`, not the city identity namespace. No municipality,
county government, membership crosswalk, endpoint or journey is inferred.

UI #144 owns the remaining root treatment: label `scope === "county"` as
“County or county equivalent” and explain “Your town is unspecified.” Keep the
existing state/locality labels. The context's household label supplies this
qualification and the saved jurisdiction resolves back to the same provider.
Opening and government consumers must preserve that scope; never choose a town
from a county label or imply city membership from an interior point.

Regenerate with `node --import tsx scripts/source/export-life-counties.ts`.
The exporter checks the existing corpus SHA and production/count declaration,
then writes only names, identity, state and provenance to browser-safe data.
It does not change source admission or catalog files. The source's 2025-01-01
observation date remains distinct from simulation time; it does not establish
historical boundary continuity or government powers.

Focused proof: county corpus equality, separate city/county identity, missing
key refusal, deterministic real setup, saved jurisdiction resolution, and the
existing national-place/state-hierarchy tests: 19 pass. TypeScript passes.
Normal pointer/keyboard creation and Save/Continue proof belongs on the composed
#144 checkpoint after its root labels consume this adapter.
