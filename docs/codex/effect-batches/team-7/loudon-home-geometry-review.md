# Two Loudon whole-place home joins remain unproven

Official municipal and commission-district geometry did not establish a whole-place join for Philadelphia or Greenback. Each city intersects one district, but the strict containment queries returned no match. A separate difference operation returned nonempty geometry. Neither town is admitted as a county home join.

## Source findings

The Tennessee Comptroller's [redistricting page](https://comptroller.tn.gov/office-functions/pa/gisredistricting/redistricting.html) links the district lookup application. Its web map identifies the seven Loudon district features recorded in the accompanying receipt. The Comptroller's [municipal boundaries page](https://comptroller.tn.gov/office-functions/pa/gisredistricting/municipal-boundaries.html) links the city dashboard and municipal geometry service.

Philadelphia's municipal feature intersects commission district 4. Greenback's municipal feature intersects district 3. The service's strict Within query returned zero features for both polygons. The municipal-polygon-minus-district diagnostic returned five rings for Philadelphia and three for Greenback. These measured results leave whole-place containment unproven. The service simplifies internally; no authored buffer or tolerance was used. The cause of the geometry differences is not established.

The canonical place-county crosswalk at the inspected main head places both Census place IDs in county 47105. That identifies the county; it does not establish an electoral district. The live layer's edit timestamp does not establish adoption, historical boundary validity, or the legal effective date of these polygons.

Loudon and Lenoir City municipal results contain multiple base and boundary-change features. Their individual base features were not treated as whole current city boundaries. No home join was attempted for them.

## Next action

Retain the missing home-join refusal until an authoritative whole-place boundary relationship or a distinct actual-home location source establishes membership. Retain the missing voter-evidence refusal. Audit found no existing canonical person-registration writer; a distinct dated registration producer and jurisdiction-specific assessment moment require CTO disposition and released ownership.

## Method and limits

Read-only public source queries were executed on October 1, 2026. Requests and responses are hashed in the accompanying receipt. The retained local raw polygons and query payloads are source evidence; no game-world mutation occurred. The crosswalk was read from main b9abe032c4904f6fb1ef17e2b56f65fa13387641. No simulation tests, browser proof, production seat admission, person registration, or core approval resulted from this source inspection.
