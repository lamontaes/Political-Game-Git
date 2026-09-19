# Political maps

Owner: MAPS (CRUNCH46 §12). The map lives under Politics → Government. MAPS owns
the geometry, the projection, the geometry compiler, the map component and the
map-only preferences. Everything the map says about people, parties, seats and
elections comes from the live World through readers other lanes own:

- WORLD owns party identity, the color order and the congressional roll.
- GOVERNING owns offices, terms and results.
- UI owns the shell mount and preference storage.

## Geometry

| Item                | Value                                                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Source              | U.S. Census Bureau 2025 cartographic boundary shapefiles (`census-cb-2025`), locked in `data/source/map-geometry/artifact-lock.json`   |
| Congress            | `cb_2025_us_cd119_*`: the 119th Congress districts, in effect for the 2024 cycle                                                       |
| State legislatures  | `cb_2025_us_sld{u,l}_500k`. Each feature keeps the `LSY` session year Census states.                                                   |
| Counties and places | `cb_2025_us_{county,place}_500k`                                                                                                       |
| Identity            | GEOIDs are copied as published and must equal the accepted Gazetteer identity catalog (`src/districts`). The packs test enforces this. |
| Rights              | Public domain (U.S. Government). Raw archives stay in the ignored `.source-cache/`. Only simplified packs are committed.               |

Compile offline:

```bash
npm run compile:map-geometry -- --acquire   # download locked archives, verify sha256, compile
npm run compile:map-geometry -- --check     # fail if committed packs are stale
npm run compile:map-membership              # candidate-district tables
```

- **Projection.** A composite Albers equal-area. Alaska and Hawaii are deliberate
  insets chosen by state FIPS, never by guessing from a point. They are labeled
  "not to scale".
- **Territories.** Puerto Rico, Guam, the U.S. Virgin Islands, American Samoa and
  the Northern Mariana Islands are not drawn on this canvas. The manifest lists
  every record excluded this way, with a reason.
- **Simplification.** Rings are cut into shared arcs at junctions. Each arc is
  simplified once, with Visvalingam and fixed endpoints, so neighboring
  districts never gap or overlap. Coordinates are then quantized and
  delta-encoded.
  - Small rings that are not the main part of a feature are dropped, and the drop
    is counted per layer in the manifest.
  - The manifest records arc counts: shared, border and overused. Overused must
    be zero.
- **Packs.**
  - `src/maps/geometry/national.generated.json` holds the states and
    congressional districts and loads with the map.
  - Each state's detail pack is loaded lazily with `import.meta.glob` when that
    state is focused.
  - Decoded paths are cached per pack. No component copies coordinates.

## What the map shows

Modes:

- U.S. House districts
- U.S. Senate delegations
- State senate districts
- State house districts
- Counties
- Cities and towns

The last four need a focused state.

**Fills** come from `projectPoliticalMap(world, {mode, stateUsps, asOf, geoids})`:

- **party:** keyed by the actual party organization id. Colors follow WORLD's
  order: setting parties first, then later parties by founding. A new party
  never recolors an older one. Slots past eight repeat with a hatch.
- **no-party:** a seated member with no public affiliation, such as an
  independent.
- **mixed:** a split Senate delegation, or a seat plus a vacancy.
- **vacant, no-current-record, not-recorded, no-voting-seat:** four distinct
  kinds that are never merged. An absent record is never colored as zero, as a
  vacancy or as a default party.
  - D.C. has no voting House seat and no Senate seats.
  - State legislative rosters exist only for seats this save's contests filled.
    All other seats read "not recorded".
- **geography:** counties and places are drawn for location only.

**Legend.** Built from what is actually drawn, with counts and descriptions.

**History.** The history slider reads the same records as of an earlier date:

- It uses `projectCongress(world, { asOf })` and the dated
  participation-state history.
- A later party change does not recolor an earlier day.
- Future dates clamp to today.
- The slider changes nothing in the World, and the date is not saved.

**Inspector.** `inspectRegion` lists the following. Names are buttons that open
the person card; nothing travels, advances time or introduces anyone.

- the office holder, their party at that date, the term and service start
- scheduled and decided contests bound to the district. Vote shares are labeled
  as the save's own results, not real returns.
- how the player relates to the place:
  - Home
  - Here
  - represents this district
  - chose to seek this seat, which is not proof of residence

## Ambiguous membership

The save records a home place, not an address. `playerGeography` reports each
chamber as one of three states.

- **Known.**
  - A place wholly inside one state legislative district (Census 2024
    district–place relationship).
  - A place whose land lies in one congressional district (Census 119th
    Congress district–2020 place relationship file, land area only). A place
    newer than that file falls back to its counties (Census county-within-CD119
    file) and is known only when every one of them lies wholly in one district.
  - An at-large state.
- **Candidates.** Every intersecting district is listed and drawn with a dashed
  outline. The inspector says the home "may be" in each one, and the save never
  picks.
- **Unknown.** The reason is stated.

A familiar town name never supplies geography. The chosen place's GEOID does.

## Adapter for UI

```tsx
const PoliticalMap = lazy(() => import("../maps/PoliticalMap"));
<PoliticalMap
  world={world}
  personId={personId}
  preferences={prefs.map}
  onPreferencesChange={(map) =>
    dispatch({ type: "set-map-preferences", preferences: map })
  }
  onOpenPerson={(id) => dispatch({ type: "open-quick-dossier", personId: id })}
  onOpenMeasure={(id) => openEntity({ kind: "measure", id })}
  focus={{ personIds: pinnedPersonIds }}
/>;
```

**Preferences.** `MapPreferences` holds `{mode, stateUsps, labels, presentation}`.
`readMapPreferences` repairs untrusted stored input field by field.

**Accessibility.**

- The SVG is an image with keyboard pan and zoom:
  - arrow keys pan
  - `+` and `-` zoom
  - `0` fits the selection
- The searchable list is the keyboard route to every region.
- Reduced motion disables fill transitions.

## Not claimed

- No real election returns, registration, population or income is shown per
  district. The save has none. When such series arrive they must carry a date, a
  denominator and a source-or-model label.
- Past governors and past state legislative rosters are not reconstructed.
- There is no travel-route layer yet. A straight line is never drawn as a route.
- There is no granted-project layer yet.
