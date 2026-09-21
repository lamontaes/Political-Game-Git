# Art request intake and regional scene coverage

Two connected paths, both new:

1. **Intake** — any thread that notices a missing picture files it where the
   Art Bench will find it.
2. **Regional scene coverage** — which approved regional plate a player's place
   may honestly show in the world introduction.

## 1. Filing a missing picture

Queue: `art/requests/incoming/`, one JSON file per request named for its
`requestId`. Filing is creating a new file, which is why two threads on two
branches can file at the same time and neither ask is lost to a merge. The
directory is the queue; there is no shared array to append to.

Schema, rules and the promotion path: `src/authoring/art-request-intake.ts`.
Filesystem half: `scripts/art-asset-factory/request-intake-store.ts`.

```
npm run intake:request -- file path/to/record.json
npm run intake:request -- list
npm run intake:request -- check
```

`file` validates before it writes and writes nothing when the record is
incomplete. It refuses to overwrite an existing id.

A record answers four things and is deliberately silent about the rest:
what is missing, where in the game it belongs, which jurisdiction it was seen
in, and why it matters. It is **not** a bench request. The inventory check, the
generator-independent recipe and the acceptance criteria are demanded at
promotion, by `promoteToAssetRequest`, which carries the record into the
existing `AssetRequest` shape in `src/authoring/asset-request.ts`. There is no
second lifecycle and no second answer to whether an asset was accepted;
`asset-lineage.ts` and `asset-bank.ts` still own that.

`jurisdiction` has two honest shapes. `specific` names the place the player was
in. `jurisdiction-independent` is a claim and must carry its reason: a blank
answer would be read later as nationwide, which is exactly the kind of silent
widening this repository's asset rules exist to prevent.

## 2. Which plate a place may show

Data: `art/regions/regional-scene-places.json`.
Resolver: `src/authoring/regional-scene-coverage.ts` (pure).
Runtime bridge: `src/presentation/regional-opening-plate.ts`.
Plates: `art/families/regional-opening/`.

```
npm run validate:regional-scenes -- --check
```

The gate validates the document and re-hashes every declared plate against its
recorded sha256, because owner approval is of exact bytes rather than of a
filename.

### Why landscape, not state

A region is keyed by landscape — `cross-timbers-oak-prairie`,
`trans-pecos-desert-mountain` — because the point of the intro plate is
recognition, and recognition follows terrain. West Texas and east Oklahoma look
much the same; El Paso and Houston are the same state and do not. Census
divisions are kept as a coarse last-resort fallback only, never as the key.

### Precedence

Most specific first: an excluded place, then an included place, then excluded
county, included county, excluded state, included state. **An exclusion at any
level disqualifies a region outright**, so excluding a county from a
state-wide plate actually removes it rather than being handed back by the
state inclusion one tier down. Below all of that sits one coarse tier: the
census division from `asset-compatibility.ts`, used only when exactly one
region's `allowedReuseRegions` covers the player's division.

### Showing nothing is a result

A wrong region is not a weaker version of recognition, it is the opposite of
it: a player from the Sonoran desert shown a pine forest has been told the
game does not know where they live. So the resolver never returns a nearest
match, an ambiguous claim resolves to nothing rather than to whichever region
sorted first, and every miss carries its reason —

- `no-place-known` — the save does not say where the player lives.
- `matched-region-has-no-plate` — a region matched, its bytes are not here.
- `no-region-covers-this-place` — nothing claims it, at any level.
- `ambiguous-coverage` — two regions claim it equally.
- `plate-file-missing` — the coverage names a file this checkout lacks.

The locality step renders with no picture in every one of those cases. The
place's own facts are unaffected.

### Identifiers

County GEOIDs are 5-digit 2020 Census strings, place GEOIDs 7-digit, both
quoted so leading zeros survive: Autauga County, Alabama is `"01001"`. State
keys are the rule-pack form, `US-KY`. The runtime recovers a GEOID from the
jurisdiction slug (`us-place-<geoid>`, `us-county-<geoid>`), which is the only
place a GEOID survives into a save; an authored jurisdiction with neither shape
resolves by state at best, which is a weaker claim honestly made.
