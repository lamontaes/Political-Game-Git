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
