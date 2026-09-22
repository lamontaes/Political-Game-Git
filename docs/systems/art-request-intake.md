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

### What the picture shows is checked before where it is

Geography alone is not enough. A picture carries a `context` — the seasons it
can honestly stand in for, its landform, its vegetation and built form, and
what kind of view it is. These are tags the resolver acts on, not prose: a
`note` reading "summer only" documents a restriction without implementing one,
and bare branches in July are wrong in the particular way that tells a player
the game is not paying attention. The season comes from the saved world's own
date; reading it moves no clock and writes nothing.

Context is applied **before** geography, so a winter plate is simply not a
candidate in July and a summer plate that only reaches the place by state can
still win. Filtering the other way round would let the most specific row win
and then discover it was the wrong season, blanking a screen that had a
perfectly good picture for it.

A delivered plate with no context is a validation error. An undeclared picture
is one that can be shown in any month.

### Several valid pictures are not a conflict

A region can legitimately have a forest view, a town view and seasonal
variants. Treating that as ambiguity would mean each newly approved scene made
more screens empty, which is the opposite of what approving art is for. So when
more than one picture is valid here, one is chosen **repeatably** — keyed on
the place, sorted by region key first, using a small local hash rather than the
world's seeded RNG, so a redraw, a reopened panel and a re-sorted file all show
the same picture and none of them touch the save. The others are reported as
`alternatives`.

Contradictory data is still a blank. Two regions cannot both be true of one
place when their landforms differ, or when one names the other in
`neverAlongside` — the Cross Timbers oak savanna and the southern
pine-hardwood forest are both rolling hills and are not the same country. That
case keeps its own diagnostic rather than resolving to a coin toss, and the
document validator catches it statically for any place claimed by both.

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
match, and every miss carries its reason —

- `no-place-known` — the save does not say where the player lives.
- `matched-region-has-no-plate` — a region matched, its bytes are not here.
- `no-region-covers-this-place` — nothing claims it, at any level.
- `no-picture-fits-this-context` — a region claims it, but every picture we
  have of it shows the wrong season or the wrong kind of view.
- `conflicting-coverage` — two regions claim it and cannot both be true of it.
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
