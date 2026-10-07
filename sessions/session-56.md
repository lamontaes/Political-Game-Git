# Session 56 — Rooms from the place's records (owner-approved story mockups, Oct 7)

Read RULES.md first. Rename this task to exactly "Session 56". Owner rule: ONE painted room serves many places through tags (an office serves many counties and agencies, a campus many colleges). Never propose one room per kind.

## Cause (read in code on main)
src/presentation/place-backdrops.ts:279 `workplacePlaceFor(classification)` picks the room from the PERSON'S occupation code and falls back to "office" (lines 283, 285, 290). So a grocery store (Warner's Market) and an auto repair shop both get the office. The painted store, diner, barbershop, factory-floor, construction-site, fire-station, hospital-hallway rooms exist in art/backdrops but are never chosen for employers.

## Items
1. Room by the EMPLOYER's recorded business kind first (its NAICS or business kind on the employer record), then the occupation, then a tag match, never a bare "office" fallback when the employer has a kind. One mapping table as data (data/content/place-kinds.json): business kind → the backdrop TAGS it needs (retail-food → store; auto repair → garage tags → construction-site/factory-floor until a garage is painted; restaurant → diner; salon → barbershop …).
2. Tags on every backdrop in art/backdrops/manifest.json (or surfaces.json): kind, uses it can serve, region/climate where it matters. The chooser picks the best-tagged room for the place's record; the same room serves every place with that need.
3. Test over all 56 places: every employer with a recorded kind gets a room whose tags match that kind; no grocery/repair/restaurant employer gets "office"; list in the PR the kinds that still lack a painted room (the CTO paints them).

## Endpoint
New game in 3 random places: the first scene's room matches the employer (store, garage-like, diner…). Screenshots main vs branch. SCREEN: READY, CTO checks.
