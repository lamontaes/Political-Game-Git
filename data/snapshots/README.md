# Real-World Data Snapshots

This directory is reserved for immutable, versioned real-world starting datasets. It does not contain simulated save history.

Every snapshot must include adjacent machine-readable metadata with, at minimum:

- `as_of` — ISO date or timestamp describing when the facts were current;
- `source` — specific citation or citations sufficient to recover and assess provenance;
- `jurisdiction` — stable jurisdiction ID or clearly scoped jurisdiction identifier;
- `status` — review and authority state.

Recommended additional fields are `snapshot_id`, `schema_version`, `retrieved_at`, `license`, `notes`, and `superseded_by`.

Suggested status meanings:

- `placeholder` — intentionally invented structural content; never factual authority;
- `candidate` — sourced but awaiting project review;
- `approved` — reviewed and eligible to initialize a new save;
- `superseded` — retained historically but replaced by an explicitly identified snapshot.

Snapshots are immutable. Correct a dataset by adding a new snapshot, marking the older one superseded, and naming its replacement. “Current” must be an explicit configuration choice; it is never inferred from modification time, filename order, or the newest date.

A new save records the exact snapshots used. Once that save begins, simulated events and rule changes are authoritative for that save. Updating repository snapshots must never silently alter an existing world.

No detailed Lexington-Fayette facts should be added until they are sourced. Any development fixture must be visibly marked `placeholder`.
