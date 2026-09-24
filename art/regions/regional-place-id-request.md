# Place and county IDs for the regional introduction scenes

Generated from `art/regions/regional-scene-places.json` by `npm run request:regional-place-ids`. Do not edit by hand; regenerate.

18 of the 23 regional scenes cannot be shown to anybody, because no place, county or state names them. This asks for the identifiers that fix that, and for nothing else.

## What is being asked for

For each region below, the counties and places whose residents should see that scene, **as Census identifiers**:

**Counties are the cheaper answer and they now work.** A town carries the counties it lies in, so naming a county covers everybody in it without enumerating its towns. Reach for places only where a county is genuinely too coarse.

- `includeCounties` — 5-digit county GEOIDs whose residents should see this scene.
- `excludeCounties` — 5-digit county GEOIDs to remove, where a broader inclusion would otherwise reach them.
- `includePlaces` — 7-digit place GEOIDs, for where a whole county is too coarse. A county with a mountain range in it is the usual case.
- `excludePlaces` — 7-digit place GEOIDs to remove for the same reason.

**An empty list is a real answer.** A region whose honest answer is "no county can be named without more work" should come back with empty lists, not with a guess. It costs nothing: a region nothing matches shows no picture, which is the current behavior.

## The rules the answer has to satisfy

1. **Every identifier is a quoted string**: `"04019"`, not `4019`. A county is exactly 5 characters and a place exactly 7. Numbers destroy leading zeros, and 21 of the 32 identifiers already in the file begin with one.
2. **Geography vintage is 2020.** The existing identifiers are 2020 Census and the runtime resolves them against its own place corpus; mixing vintages silently moves a boundary.
3. **A place GEOID is state + place, not a county nesting code.** A county cannot be derived from it, so a place answer does not imply its county and both are asked for separately.
4. **Most specific wins, and an exclusion at any level disqualifies the region outright.** Excluding one county from a region genuinely removes it; it is not handed back by a broader inclusion.
5. **A described area is not an answer.** "The lower, warmer parts of Pima, Pinal and Maricopa" is the input to this question, not its output. The previous round came back in that form, which is why this is being asked again.

## The shape of the answer

The same shape as `regional-scene-places-first-five.json`, which merged cleanly: a JSON array, one object per region, `regionKey` exactly as written below, and a `places` object. Regions may be answered in any order, and a region may be left out entirely if it is not being answered.

```json
[
  {
    "regionKey": "northwoods-lake-forest",
    "places": {
      "includeStates": [],
      "includeCounties": ["26003", "26013"],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "What this list claims and what it deliberately does not."
    }
  }
]
```

## Worked example: the same input, already converted

`sonoran-desert` was answered in the first round and is in the file now. Its research text reads:

> **Envelope.** Saguaro-bearing southern/central Arizona uplands, including Tucson and Phoenix basin foothills and the Ajo vicinity.

> **Refinement.** Review the lower, warmer parts of Pima, Pinal, Maricopa and appropriate adjacent counties; mountains inside a county need separate exclusions/point tests. County presence alone is insufficient.

And the answer that text produced was:

```json
{
  "regionKey": "sonoran-desert",
  "places": {
    "includeStates": [],
    "includeCounties": [],
    "excludeCounties": [],
    "includePlaces": [
      "0400870",
      "0402830",
      "0410180",
      "0411160",
      "0411230",
      "0411300",
      "0425300",
      "0444270",
      "0451600",
      "0455000",
      "0455300",
      "0465000",
      "0477000",
      "0477035",
      "0477179"
    ],
    "excludePlaces": []
  }
}
```

Note what it did with the refinement: rather than naming Pima, Pinal and Maricopa as counties, it named places inside them, because the counties contain high country the scene does not describe. That judgment is the work being asked for.

## The regions

Each region's own research text follows, in the owner's words. Convert it; do not replace it.

### `appalachian-town-january`

**Appalachian town — dormant-season intro**

- **Envelope.** Dormant-season version of a generic wooded Appalachian valley town; appropriate eastern Kentucky/West Virginia and comparable valley settlements.
- **County and locality refinement.** Use valley relief plus town streetscape. A source town is not an exclusive locality license. Compile separately from broad flat plateau towns.
- **What the picture shows.** Request explicitly bare deciduous trees and dormant brown ground, without invented snow. At the inspected catalog it shares the SAME selected byte hash as pikeville-valley-street; inspect role/parent before calling it an independently finished winter scene.
- **Do not assume.** Automatic all-Appalachia/all-Kentucky, leafy summer source labeled January, or forced snowfall.
- **Tagged as.** winter, valley-and-ridge, street.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `basalt-coulee-steppe`

**Interior Northwest: basalt coulee and steppe**

- **Envelope.** Columbia Plateau/Channeled Scablands coulees of eastern Washington, especially appropriate Grant/Adams-area basalt channel terrain.
- **County and locality refinement.** Use coulee/escarpment subareas, not every agricultural or flat plateau locality. Drumheller near Othello and Potholes/Quincy landscape references are useful.
- **What the picture shows.** Request describes basalt escarpment/talus and dry grass/shrub ground. Pixels uninspected.
- **Do not assume.** Olympic rainforest, all Washington, red sandstone Utah scenery, or every location on the multi-state Ice Age Floods trail.
- **Tagged as.** spring/summer/autumn, basalt-steppe, open-landscape.
- **Sources.** https://www.nps.gov/places/drumheller-channels-national-natural-landmark.htm · https://science.nasa.gov/earth/earth-observatory/channeled-scablands-92025/ · https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `buchanan-small-town`

**Great Lakes / Midwest: low-rise main street**

- **Envelope.** Generic low-rise Great Lakes/Midwestern main street represented by the Buchanan-source composition.
- **County and locality refinement.** Match low-rise main-street built form and appropriate regional setting; Buchanan Michigan is a reference, not the only allowed place.
- **What the picture shows.** Request is leaf-on/nonwinter brick-commercial streetscape; actual current candidate not visually inspected this pass.
- **Do not assume.** A universal city main street, high-rise downtowns, different mountain/desert backdrops, readable named signage contradicting the locality.
- **Tagged as.** spring/summer/autumn, rolling-hills, street.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `champlain-lake-lowland`

**Lake Champlain: broad lake and distant hills**

- **Envelope.** Lake Champlain low-shore surroundings in western Vermont and eastern New York.
- **County and locality refinement.** Use the lake-facing lowland corridor, not all mountain portions of Chittenden/Addison/Franklin/Grand Isle or Clinton/Essex counties. Neighboring lake views may be compatible only if landform/scale fits.
- **What the picture shows.** Request explicitly open water, leafy summer shores and low distant wooded hills. Candidate pixels uninspected.
- **Do not assume.** Mountain-wall fjords, ocean surf, frozen January lake, inland sites with no lake-region connection.
- **Tagged as.** summer, lake-lowland, shoreline.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `colorado-plateau-redrock`

**Colorado Plateau: sandstone fins and scrub**

- **Envelope.** Red-sandstone country of southern/eastern Utah, northern Arizona and compatible western Colorado/northwestern New Mexico areas.
- **County and locality refinement.** Use redrock landform subregions; the whole Colorado Plateau also contains wooded highlands and different-colored geology.
- **What the picture shows.** Request describes cliffs/fins and sparse vegetation; no exact famous arch. Candidate pixels uninspected.
- **Do not assume.** All of the four states, alpine forest, Great Basin sage flats, or recognizable landmarks not supported by the image.
- **Tagged as.** spring/summer/autumn/winter, plateau-canyon, open-landscape.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `fort-pierre-prairie-pond`

**Great Plains: open grassland and pond**

- **Envelope.** Open rolling central/northern Plains grassland with a small pond; Fort Pierre-source terrain as a representative anchor.
- **County and locality refinement.** Use appropriate grassland and water-feature context across South Dakota and comparable central-Plains sites; cannot assert every resident has this pond nearby.
- **What the picture shows.** Nonwinter/open-water grassland image request; pixels uninspected.
- **Do not assume.** Winter no-pond variant, mountain lakes, Great Lakes forest shore or dense crop cover.
- **Tagged as.** spring/summer/autumn, flat-plains, open-landscape.
- **Sources.** https://www.nps.gov/tapr/learn/nature/prairies-and-grasslands.htm · https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `great-plains-january`

**Great Plains — dormant-season intro**

- **Envelope.** Dormant grassland setting in suitable central/northern Plains open country.
- **County and locality refinement.** Grassland type and relief first, not all Plains state territory; avoid forested hills, cropland and city streets.
- **What the picture shows.** Request explicitly dormant straw grass and NO pond, rather than inventing ice conditions. Pixels uninspected.
- **Do not assume.** Using the pond reference unchanged as a January asset, forcing snow or routing all open terrain to this scene.
- **Tagged as.** winter, flat-plains, open-landscape.
- **Sources.** https://www.nps.gov/tapr/learn/nature/prairies-and-grasslands.htm · https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `green-mountain-forest`

**Green Mountains: wooded ridges**

- **Envelope.** Rounded forested Green Mountain uplands in Vermont and carefully matched adjacent northern Appalachian uplands.
- **County and locality refinement.** Keep higher/cooler forested ridges separate from Champlain lowlands. Northern-hardwood versus high spruce/fir distinctions matter to the exact image.
- **What the picture shows.** Request explicitly green summer canopy; not peak autumn or snow. Candidate pixels uninspected.
- **Do not assume.** Alpine Rockies, treeless summits, all Vermont lowlands or automatic autumn leaves.
- **Tagged as.** summer, forested-upland, open-landscape.
- **Sources.** https://www.vtfishandwildlife.com/conserve/conservation-planning/natural-community-fact-sheets/northern-hardwood-forest · https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `lower-mississippi-delta-marsh`

**Lower Mississippi Delta: marsh and bayou**

- **Envelope.** Low coastal marsh and distributary-channel landscapes at the Mississippi mouth in southeastern Louisiana.
- **County and locality refinement.** Start with appropriate lower Plaquemines/coastal delta subareas; evaluate adjoining coastal marsh rather than the entire inland Mississippi Delta region.
- **What the picture shows.** Request describes flat reed/grassy marsh and channels. Catalog-selected image688x456; verify larger original or proper output. Pixels uninspected.
- **Do not assume.** Cotton fields in the inland Mississippi Delta, leveed urban centers, upland woods, or all lower Mississippi counties.
- **Tagged as.** spring/summer/autumn, coastal-lowland, open-landscape.
- **Sources.** https://www.recreation.gov/camping/gateways/1374 · https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `north-atlantic-granite-coast`

**North Atlantic: granite ledges and sea**

- **Envelope.** Rocky Maine/coastal New England sites with granite ledges and sea, including the Acadia/Schoodic/Isle-au-Haut visual family.
- **County and locality refinement.** Use coastal geology and distance-to-coast; inland portions of coastal counties do not qualify automatically.
- **What the picture shows.** Request describes exposed pink/gray granite shoreline and open water, no lighthouse or named skyline. Pixels uninspected.
- **Do not assume.** Sandy barrier beaches, marsh estuaries, inland Maine or all Atlantic coastal counties.
- **Tagged as.** spring/summer/autumn, rocky-shoreline, shoreline.
- **Sources.** https://home.nps.gov/acad/learn/nature/coasts.htm

### `northwoods-lake-forest`

**Northwoods: forest around an open lake**

- **Envelope.** Lake-and-forest country of northern Minnesota, northern Wisconsin and Michigan Upper Peninsula; suitable comparable northern Great Lakes settings.
- **County and locality refinement.** Tie the view to actual lake-country surroundings, not all municipalities in a state. Use a regional establishing interpretation, not an invented lake on the player street.
- **What the picture shows.** Request explicitly summer with unfrozen water, forested/rocky shore. Candidate pixels uninspected.
- **Do not assume.** Winter ice, southern agricultural Plains, open Great Lakes surf coast, or every swamp/forest cell.
- **Tagged as.** summer, lake-lowland, shoreline.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `pikeville-valley-street`

**Appalachian coal-region towns: wooded-valley street**

- **Envelope.** Ordinary Appalachian wooded-valley town streetscape based on the corrected Pikeville composition.
- **County and locality refinement.** Allow compatible valley towns beyond Pikeville, with terrain/built-form checks; a particular named landmark/sign would narrow eligibility and must be read visually.
- **What the picture shows.** Selected image has road-marking correction notes; candidate pixels not freshly inspected this pass. Treat leaf-on versus dormant request separately.
- **Do not assume.** All Kentucky, flat Bluegrass towns, indiscriminate US main streets, or treating the same bytes as proof of an independently generated winter revision.
- **Tagged as.** spring/summer/autumn, valley-and-ridge, street.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `rocky-mountain-montane`

**Rocky Mountains: winter meadow and conifers**

- **Envelope.** Conifer/meadow montane belts below treeline in appropriate Rocky Mountain settings.
- **County and locality refinement.** Compile the montane landscape separately from alpine peaks, dry basin floors and plains. Snow state must match or the scene must be explicitly a seasonal illustration.
- **What the picture shows.** IMPORTANT: this request is WINTER, tawny meadow plus patchy settled snow and pine/fir; candidate pixels uninspected.
- **Do not assume.** Generic year-round Rockies, summer meadow, snowstorm, ski infrastructure or claiming current snowfall from a static plate.
- **Tagged as.** winter, montane-slope, open-landscape.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `southern-high-plains`

**Southern High Plains: open shortgrass**

- **Envelope.** Llano Estacado and adjoining southern High Plains across the Texas Panhandle/South Plains and eastern New Mexico.
- **County and locality refinement.** Compile nearly level open shortgrass sites separately from Caprock/canyon edges, irrigated cropland and urban centers.
- **What the picture shows.** Request describes broad flat horizon, short grass and sparse brush, with no mountains. Candidate pixels uninspected.
- **Do not assume.** All Plains states, rolling oak country, tallgrass meadows, or assuming every agricultural place is native grassland.
- **Tagged as.** spring/summer/autumn, flat-plains, open-landscape.
- **Sources.** https://www.nps.gov/tapr/learn/nature/prairies-and-grasslands.htm · https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `southern-pine-hardwood`

**East Texas: pine and hardwood woodland**

- **Envelope.** East Texas and adjoining western Louisiana pine/hardwood uplands.
- **County and locality refinement.** Use upland pine/hardwood subregions; distinguish them from floodplain swamps, coastal marsh and central-Texas oak prairie.
- **What the picture shows.** Request has tall pine and broadleaf mixture, gentle terrain and leafy forest floor. Candidate pixels uninspected.
- **Do not assume.** Reusing the approved Cross Timbers image, a mangrove scene, or all of Texas/Louisiana. Check distinct exact candidate hashes and request associations.
- **Tagged as.** spring/summer/autumn, rolling-hills, open-landscape.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `subtropical-mangrove-wetland`

**South Florida: mangrove shoreline**

- **Envelope.** Sheltered coastal southern Florida estuaries, especially Everglades/Florida Bay and southwest coast environments matching red-mangrove roots.
- **County and locality refinement.** Coastal subareas of Monroe, Miami-Dade, Collier and suitable neighboring estuaries require finer bounds than whole counties.
- **What the picture shows.** Request describes red-mangrove prop/stilt roots and estuarine water. Selected catalog preview is only640x432; check for a larger original or needed generation. Pixels uninspected.
- **Do not assume.** Inland freshwater Everglades, pine uplands, all Florida, or extending the same red-root picture to all Gulf black-mangrove habitats.
- **Tagged as.** spring/summer/autumn/winter, coastal-lowland, shoreline.
- **Sources.** https://www.nps.gov/ever/learn/nature/mangroves.htm

### `trans-pecos-desert-mountain`

**Trans-Pecos: desert basin and mountains**

- **Envelope.** Desert basins and mountain fronts of far-west Texas in the Trans-Pecos/Chihuahuan landscape.
- **County and locality refinement.** Review Brewster, Presidio, Jeff Davis, Culberson, Hudspeth and appropriate El Paso areas against terrain. Do not match simply because state is Texas.
- **What the picture shows.** Request describes rocky desert mountain forms, sparse shrubs/yucca and quiet daylight. Actual selected candidate pixels not independently inspected this pass.
- **Do not assume.** Sonoran saguaro forests, High Plains flatlands, pine-covered alpine views, or named tourist formations not actually painted.
- **Tagged as.** spring/summer/autumn/winter, desert-basin-and-range, open-landscape.
- **Sources.** https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

### `upper-midwest-tallgrass-prairie`

**Upper Midwest: tallgrass landscape**

- **Envelope.** Open tallgrass prairie landscapes in suitable Upper Midwest/eastern Great Plains transition sites.
- **County and locality refinement.** Use actual prairie remnants/grassland context or a disclosed regional landscape interpretation; a historical tallgrass ecoregion currently cropped is not an automatic present-day flower meadow.
- **What the picture shows.** Request describes flowering/tall grasses and open land; seasonal appearance is not winter dormant grass. Candidate pixels uninspected.
- **Do not assume.** Universal Illinois/Iowa farmland, treeless shortgrass arid plains, forested lake shore.
- **Tagged as.** spring/summer/autumn, flat-plains, open-landscape.
- **Sources.** https://www.nps.gov/tapr/learn/nature/prairies-and-grasslands.htm · https://www.epa.gov/eco-research/level-iii-and-iv-ecoregions-continental-united-states

## Already answered, not being asked again

- `cross-timbers-oak-prairie` — 7 place(s).
- `norcal-oak-woodland` — 5 place(s).
- `pacific-temperate-rainforest` — 4 place(s).
- `socal-inland-bungalow-neighborhood` — 1 place(s).
- `sonoran-desert` — 15 place(s).

Broader coverage for these is welcome as a separate pass, since the existing lists are starter sets rather than the full researched corridor. It is not part of this request.
