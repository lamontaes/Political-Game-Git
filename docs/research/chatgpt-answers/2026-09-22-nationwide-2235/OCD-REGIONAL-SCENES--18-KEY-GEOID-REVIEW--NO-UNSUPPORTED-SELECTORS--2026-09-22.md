# Regional scene selector research handoff

**Request:** `regional-scene-place-ids`, filed 2026-09-22. **Scope:** all 18 currently unmatched region keys in `art/regions/regional-place-id-request.md`. This is a research handoff; the repository mapping and Drive were not edited.

## Method and limits

The request specifies 2020 Census geography, county GEOIDs as five-character strings, and place GEOIDs as seven-character strings. Candidate county codes were checked against 2020 Census Bureau geography, but **valid identifiers are not enough to establish that the pictured landform, season, vegetation or built form fits an actual starting place**. The source request itself uses the Sonoran Desert example to show why broad county coverage can be wrong. Candidate scene pixels were not visually accepted in this pass.

The first draft proposed six county-based selectors. On review, each would include people outside the brief’s stated scene envelope, and one mistakenly used Hughes County for a Fort Pierre anchor; Fort Pierre is in Stanley County. All 18 selectors are therefore left empty. Named counties remain in the notes only as leads for later place/land-cover and visual review. This is a full 18-key research response with explicit unknowns, not scene admission or a recommendation to change the runtime mapping.

Official references: [2020 Census Gazetteer](https://www.census.gov/geographies/reference-files/2020/geo/gazetter-file.html), [2020 FIPS files](https://www.census.gov/geographies/reference-files/2020/demo/popest/2020-fips.html), [Census Fort Pierre place record](https://tigerweb.geo.census.gov/tigerwebmain/Files/bas26/tigerweb_bas26_incplace_2020_tab20_sd.html), and [2020 Census Stanley County record](https://tigerweb.geo.census.gov/tigerwebmain/Files/bas25/tigerweb_bas25_county_2020_tab20_sd.html).

## Proposed answer

```json
[
  {
    "regionKey": "appalachian-town-january",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "Narrow eastern Kentucky coalfield/valley-town starter: Floyd, Harlan, Letcher, Perry and Pike counties. Counties include uplands and do not prove a given street is in a valley; comparable West Virginia and other Appalachian sites remain uncovered. Research lead, not a selector: 21071, 21095, 21133, 21193, 21195. County membership alone does not establish this scene’s street, landform, season, or vegetation at a resident’s actual place."
    }
  },
  {
    "regionKey": "basalt-coulee-steppe",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "Adams and Grant counties, Washington, are the named Othello/Drumheller and Potholes/Quincy-area footprint. Counties include agricultural flats beyond coulees; regional scene interpretation only. Research lead, not a selector: 53001, 53025. County membership alone does not establish this scene’s street, landform, season, or vegetation at a resident’s actual place."
    }
  },
  {
    "regionKey": "buchanan-small-town",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "Berrien County, Michigan, anchors the source composition's Great Lakes low-rise town setting. Broader Midwest coverage needs a compatible-town inventory; county membership does not establish built form for each locality. Research lead, not a selector: 26021. County membership alone does not establish this scene’s street, landform, season, or vegetation at a resident’s actual place."
    }
  },
  {
    "regionKey": "champlain-lake-lowland",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No county-wide selector: the named Vermont/New York counties include inland and upland territory, contrary to the lake-facing low-shore limit. Needs a vetted 2020 shoreline locality footprint."
    }
  },
  {
    "regionKey": "colorado-plateau-redrock",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No selector: candidate counties across four states mix red sandstone with wooded highlands, basins and other geology. Needs a vetted redrock landform locality crosswalk."
    }
  },
  {
    "regionKey": "fort-pierre-prairie-pond",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "Fort Pierre lies in Stanley County (46117), not Hughes County (46065). Neither county membership nor the source town establishes nearby pond/open grassland for a resident, so this scene remains unassigned."
    }
  },
  {
    "regionKey": "great-plains-january",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No county selector: dormant open grassland cannot be distinguished from cropland, forested hills and streets from county codes alone. The pond scene is not a winter substitute."
    }
  },
  {
    "regionKey": "green-mountain-forest",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No county-wide selector: Green Mountain ridges occupy only parts of counties, and ridge forest type is unresolved. Needs vetted ridge/forest localities."
    }
  },
  {
    "regionKey": "lower-mississippi-delta-marsh",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No county-wide selector: lower coastal parishes include urban, leveed, inland and non-marsh areas. Needs a verified marsh/distributary footprint."
    }
  },
  {
    "regionKey": "north-atlantic-granite-coast",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No county-wide selector: counties include inland areas and sandy/marsh shores, while granite ledges are shoreline-scale. Needs named, verified granite-coast localities."
    }
  },
  {
    "regionKey": "northwoods-lake-forest",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No county selector: county membership cannot establish an open-lake setting and counties include other landscapes. Needs a lake-country locality rule."
    }
  },
  {
    "regionKey": "pikeville-valley-street",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "Same narrow eastern Kentucky coalfield county footprint as the January town entry; compatible wooded-valley town streets are intended, but street-level relief is not guaranteed. Broader Appalachian coverage needs locality evidence. Source currently shares bytes with the January entry, not proof of a distinct winter asset. Research lead, not a selector: 21071, 21095, 21133, 21193, 21195. County membership alone does not establish this scene’s street, landform, season, or vegetation at a resident’s actual place."
    }
  },
  {
    "regionKey": "rocky-mountain-montane",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No county-wide selector: counties span plains, basins, alpine peaks and montane belts. Needs finer elevation/land-cover and seasonal criteria."
    }
  },
  {
    "regionKey": "southern-high-plains",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No selector: Llano Estacado counties mix caprock/canyons, cropland and urban land with open shortgrass. Needs defensible landform/land-cover screening."
    }
  },
  {
    "regionKey": "southern-pine-hardwood",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No selector: East Texas/western Louisiana counties mix pine uplands with floodplain swamp, urban and other land cover. Needs vetted upland localities and distinct scene evidence."
    }
  },
  {
    "regionKey": "subtropical-mangrove-wetland",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No county-wide selector: Monroe, Miami-Dade and Collier contain inland freshwater, pine uplands, urban land and multiple shores. Needs verified sheltered red-mangrove estuary bounds."
    }
  },
  {
    "regionKey": "trans-pecos-desert-mountain",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "Brewster, Culberson, El Paso, Hudspeth, Jeff Davis and Presidio counties form the named far-west Texas candidate region. Broad basin-and-range establishing interpretation; varied county terrain means no claim every resident is beside rocky desert/mountains. No other Texas county included. Research lead, not a selector: 48043, 48109, 48141, 48229, 48243, 48377. County membership alone does not establish this scene’s street, landform, season, or vegetation at a resident’s actual place."
    }
  },
  {
    "regionKey": "upper-midwest-tallgrass-prairie",
    "places": {
      "includeStates": [],
      "includeCounties": [],
      "excludeCounties": [],
      "includePlaces": [],
      "excludePlaces": [],
      "note": "No selector: historical tallgrass ecoregion is not proof of present-day flowering prairie; cropland and forested lake shore would be false matches. Needs actual remnant/open-prairie evidence."
    }
  }
]
```

## Coverage and identifier validation

- All 18 requested `regionKey` values are present in the embedded JSON.
- All 18 have empty selectors because the supplied text, county membership, and uninspected candidate pixels do not justify a place-level match. Empty is an intentional answer under the filed request.
- Five former county anchor sets and the corrected Fort Pierre/Stanley anchor are retained only as research leads in each note. They are not recommended `includeCounties` values.
- No place GEOIDs were proposed. The next useful evidence is a vetted list of 2020 Census places with scene-specific landform/built-form/season checks plus actual image inspection. Until then, the 18 scenes should remain unmatched rather than appear in places the image may misrepresent.
