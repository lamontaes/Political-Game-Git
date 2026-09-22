# Private Art Desk

Status: **ALIVE43 Role A authoring contract (`alive43-art-desk-v1`)**

The Art Desk is a private loopback authoring surface. It reuses the durable
`art/requests/` registry, existing gallery/scene preview components, and the
identified `dev:identified` launcher. It is not a player route and it is not a
runtime image generator.

## What it may write

Allowlisted JSON under `art/requests/` and private candidate bytes under
`art/generated/candidates/art-desk/` (gitignored). Writes are loopback-only,
origin-checked, atomic, and If-Match hashed. Ordinary production builds do not
mount the bridge or the desk.

## Review vs release

A desk approval binds the SHA-256 of the bytes that were seen. Changed bytes
lose that approval. Private acceptance is not public `runtime_release_status`,
not production deployment, and not a save mutation.

## Compatibility tags

Environment class, built character, climate, terrain, vegetation, season,
weather/light, indoor/outdoor, source-reference region, allowed reuse regions,
exact-literal vs generic place identity, exclusions, and parent/variant
geometry live in `src/authoring/asset-compatibility.ts`. Winter does not imply
snow. A named landmark is not generic scenery.

## Native revision round trip

The private client's Art Bench preload exposes only candidate ID, expected
revision and SHA-256 for export preparation and drag. The host accepts the
current bench main frame only, fetches through its authenticated loopback
bridge, checks identity and bytes, then reuses an immutable cached raster.
The renderer cannot supply filesystem paths. A macOS drag icon is a display
derivative; the dragged file is always the unchanged stored source.

Viewed revision, preferred candidate, pixel approval and runtime installation
remain separate states. View preferences survive client restart; a batch does
not change the viewed bytes. The explicit edited-version drop target carries
the viewed parent/request automatically. Multiple unmatched drops remain inbox
items. Original downloads are not overwritten. Candidate export and private
catalog availability do not require approval. Geometry-changing edits retain
calibration recheck requirements.

A local received branch can serve the bench from the selected repository's
clean committed checkout, without rewriting it or restaging the art bank.
Published branch behavior remains available. Both modes use the same durable
record root and Drive exchange; game builds and saves remain separately owned.
