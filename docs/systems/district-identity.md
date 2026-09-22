# District identity and residence

The Census Gazetteer political-districts corpus identifies numbered districts
by chamber and GEOID, with area and an interior point. The interior point is
not a boundary and is not home membership. The game never assigns a district
from a coordinate, a nearest centroid, a city, a county, or statewide
residence.

A Census place can be joined to a numbered state-legislative district when the
2024 SLDL/SLDU–2020 place relationship files show that place lying wholly
inside one district of that chamber, and that district exists in the 2025
Gazetteer identity catalog. A place split across districts is conflicting, not
a guess. County and statewide homes stay unknown. Congressional place joins
are unpublished here.

A seat binding is an explicit versioned identity: vintage, compiler, chamber,
GEOID, record id (`chamber:geoid`), and state. Residual codes `ZZ`/`ZZZ` are
refused. Identical GEOIDs across congressional, upper, and lower files stay
distinct because chamber is part of the key.

A player may select a desired district as the seat to file for. That intent is
not a residence interval and does not satisfy a geographic candidacy rule,
including after time has passed.

District residence is an append-only interval on world history. It is written
by a World establishment or move with supported provenance (`authored`, a
simulated event that names its source, or a verified `canonical-home-join`).
Missing history, including old saves, is UNKNOWN. World stepping and
save/reload do not resample intervals or seats. Qualification reads only those
proved intervals.

This is not the completed geographic system. It is the supported whole-place
membership connection plus the identity catalog already on this branch.

## When a canonical-home interval starts

A `canonical-home-join` interval starts when the world's own records say this
life came to live in that place, read by `homeJurisdictionResidenceSince` from
the same household memberships and residence facts the state-residence clock
reads. Starting it on the day the world happened to be written made one home
carry two clocks: resident in the state since 1985 and in its house district
since today. Nothing in the records says that, and a residence requirement
measured against it refuses a lifelong resident.

What that dates is residence in the territory. The district lines are the
catalog's own vintage, named in the interval's provenance note, and the
interval claims nothing about where a boundary ran in an earlier year.

Nothing here backfills: old saves are still UNKNOWN, and an interval already
open for a district is left as it stands.

## Two different unknowns

A district-residence duration can be missing for two reasons, and a refusal
says which. A town split across several districts is the join declining to
pick one of them; anything else is the world not holding the record.
`canonicalHomeDistrictKnowledge` answers `known`, `split` or `unknown`, and
candidacy passes that on as `districtResidenceGap` (and `districtIsUnknown`
on the sourced-pack path) so the player is told the real gap. Neither one
grants anything: both still refuse.
