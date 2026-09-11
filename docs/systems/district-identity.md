# District identity and residence

The Census Gazetteer political-districts corpus identifies numbered districts
by chamber and GEOID, with area and an interior point. The interior point is
not a boundary and is not home membership. The game never assigns a district
from a coordinate, a nearest centroid, a city, a county, or statewide
residence.

A seat binding is an explicit versioned identity: vintage, compiler, chamber,
GEOID, record id (`chamber:geoid`), and state. Residual codes `ZZ`/`ZZZ` are
refused. Identical GEOIDs across congressional, upper, and lower files stay
distinct because chamber is part of the key.

District residence is an append-only interval on world history. It is written
only by an establishment, move, or player-selection event with an explicit
start date. Missing history, including old saves, is UNKNOWN. World stepping
and save/reload do not resample intervals or seats.
