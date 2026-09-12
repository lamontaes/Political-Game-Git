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
