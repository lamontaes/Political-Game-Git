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

### What an outdoor plate has to declare

A request for an **outdoor** environment plate must also say what the picture
shows: `visualContext.seasons`, `landform` and `sceneKind`, in the same
vocabulary the resolver uses. This is the gap that let three regional scenes be
requested with their season only in the prose — "explicitly winter", "green
summer canopy" — where nothing could act on it and the constraint survived only
as long as somebody remembered reading it. At promotion those tags become the
first acceptance criteria on the bench request, so a delivery showing the wrong
time of year can be failed rather than argued about.

Indoors none of it is asked. A thread reporting that a community room has no
art does not classify vegetation to be taken seriously, and paperwork that
makes gaps go unreported costs more than it saves. `targetClass:
"environment-plate"` must name an `environmentClass`, and that answer is what
decides which of the two questions the record is asked.

### What a figure request has to declare

A request for a body carries a `figureContext` with a `postureClass` from the
pose families' own vocabulary (`POSE_POSTURE_CLASSES`), so a body request speaks
the same words as the poses it will fill. A non-standing posture must also name
its `postureCues` — `bent-knees`, `thighs-forward`. This is the seated-chair
case: a plate labeled `seated` that is really a short upright figure lands
every contact assertion (pelvis on the seat plane, soles on the floor) and
still reads as standing behind the chair, so "seated" as a bare label is not
enough. At promotion the cues become an acceptance criterion naming the wrong
delivery outright: a figure that merely stands, or an upright figure with
shorter legs, is wrong even when its contacts are correct.

A record carries a figure posture or an environment context, not both, and the
validator refuses one that carries both. The intake's target vocabulary does
not yet name a figure class, so the presence of `figureContext` is what marks a
record as a figure request; forcing every figure request to carry it the way an
outdoor plate is forced to carry its season would need that class, which
reaches into `asset-lineage.ts`.

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

Place, then county, then state, most specific winning. **An exclusion at any
level disqualifies a region outright**, including over a finer inclusion: a
place listed inside an excluded county does not get the plate. That is one
rule rather than two and the conservative direction when they disagree; mixed
country is better handled by naming the towns that fit than by excluding a
county and re-including parts of it.

There is no coarser tier than the state. A census-division fallback was tried
and removed: `pacific` is Alaska, Hawaii, California, Oregon and Washington,
and a division-wide fallback would let the Olympic rainforest plate stand in
for Honolulu. A specific regional scene needs positive geographic eligibility,
not a bucket that happens to contain it.

**County lists do not yet reach an ordinary town.** A place GEOID is state plus
place, not a county nesting code, and the runtime corpus carries no
place-to-county crosswalk, so a town cannot say which county it is in. County
selectors work for a life started at county scope; for a town they match
nothing. The validator warns on any county list, and the honest move until a
crosswalk exists is to name the towns that fit. A researched place identifier
resolves against the 2025 Gazetteer corpus the game actually starts lives in,
and an authored place such as Lexington resolves by the GEOID it already
carries rather than by its slug.

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

## What has been asked for, and why

Filed 2026-09-22 on `claude/art-bench-requests-sbi892`. Recorded here rather
than left in a thread, because this file is what a reader — or ChatGPT
compiling a report — will actually find.

### Ten state capitol exteriors

`src/environment/reference/corpus.ts` records a capitol building identity for
ten states: Kentucky, Virginia, Tennessee, California, Minnesota, Texas, New
York, North Dakota, Nebraska and New Mexico. No capitol picture exists
anywhere in the project — all 126 records in `art/manifest/asset_manifest.json`
were read, eleven of them environment plates, and the civic exteriors it holds
are a campaign storefront, a park pavilion and a neighborhood doorstep. The
consumer is the `state` step of the world introduction, which is the one step
of four with no artwork behind it.

The records were generated from the corpus rather than typed. Priority follows
`referencePack`: P1 for the six states with a strong source family, P2 for the
four still pending — a sourcing reason, not a judgment about the state.
`minimumWidth: 2208` and `alphaRequired: false` come from measuring the two
regional plates that already ship into that same panel (2496x1664 and
2208x1584, both 8-bit RGB), not from a guess.

The corpus's own anti-assumption is carried into every brief: **a Capitol
identity does not establish an everyday working office or a current
occupant.** These ask for the building, not for a scene of anyone governing
in it.

The other forty-one jurisdictions have no recorded capitol identity, so they
cannot be filed this way. That is a sourcing question, not an art question.

### Three interface graphics

Asked for on 2026-09-22: art requests beyond backgrounds — newspapers, UI
things, graphs — and explicitly not clothing.

- **`ui-newspaper-page-furniture`** (P1). The news front page is drawn
  entirely in CSS and system fonts; `src/player/news/news.css` was read in
  full and its whole visual treatment is `font-family`, `letter-spacing` and
  `text-transform`, with no image reference in it. This surface is the
  cheapest in the game to make look right, because it is the only finished one
  that needs no engineering first.
- **`ui-masthead-ornaments-four-families`** (P2). Four is measured, not
  chosen: `MASTHEAD_STYLES` is 4 in `src/presentation/news-front-page.ts` and
  `styleFor()` hashes every outlet key into that range. The game already sorts
  outlets into four kinds and distinguishes them by typeface alone.
- **`ui-shell-reference-icons`** (P2). Five is closed and measured: `ShellRef`
  in `src/presentation/shell-navigation.ts` is exactly five kinds — person,
  commitment, measure, government, organization — and that file states why a
  sixth was deliberately not added. The project has no icon set at all; the
  only SVGs on disk are pose control plates and arm-measurement overlays,
  which are authoring evidence rather than shipped art.

Two constraints run through all three, and both come from the code rather than
from taste:

**No lettering in the artwork.** Outlet names, headlines and dates are all
generated per world. A word painted into the art would be a fact the game
never recorded, and it would appear beside the facts it did.

**Government and organization stay distinct at icon size.**
`shell-navigation.ts` is emphatic that a place and the government of that
place are different things, and that blurring them is the first step towards
a shortcut that quietly implies where the player lives.

### `interface-graphic`, and why it is different from `character-component`

`character-component` was **recorded**: six entries already shipped with it
while `AssetTargetClass` did not list it, so adding it wrote down something
that was already true.

`interface-graphic` is **introduced**. Nothing used it before. It exists
because the four earlier classes cannot hold a masthead ornament — it is not
a room the compositor paints, not a menu tableau, not a part of a person, and
not `reference`, which means never shipped.

The boundary that keeps it honest: an interface graphic is drawn once and
reused wherever that interface element appears, and it never asserts a fact
about the world. An icon for `measure` stands for the idea of a measure; it
does not depict any particular bill. Anything depicting a real, identified
subject belongs in one of the other classes, where the likeness and
provenance rules apply to it.

### What was deliberately not filed

The twenty-three regions in `art/regions/regional-scene-places.json` all
already carry a `benchRequestId` of the form `playtest65-region-*`, because
they came from the Art Bench in the first place. Re-filing them would have put
a second copy of twenty-three asks on the Art Desk. What those regions lack is
place selectors — already filed as a research question — and bytes for three
approved plates, which are blocked on the owner's machine. Neither is a filing
job.

This is the second duplicate caught before it reached the Desk. The first was
`seated-at-desk-modular-body` and `standing-at-lectern-modular-body`, which
ask for the same pictures as registry entries that already exist. **Check what
the project already owns and has not registered before asking for anything
new.** A duplicate on the Desk costs more than a missing request does.
