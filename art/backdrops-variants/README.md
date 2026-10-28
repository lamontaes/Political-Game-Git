# Backdrop variants (generated, not yet in the game)

Paintings generated for `docs/art/WANTED.md`, named like `art/backdrops`: `<place>__<variant>.jpg`. Variants of an existing place are at the same size as that place's midday painting. The builder moves a file into `art/backdrops` and adds it to the backdrop index, then strikes the WANTED row. `prompts.json` gives every file's prompt and reference painting.

## Same camera (measured spots carry over)
Firefly edits of the place's midday painting with the layout kept (same walls, furniture, paths, doorways and camera), so mannequin spots measured on the place line up.

- `lived-in`: the same room untidy the way real homes are (jacket on a chair, shoes by the door, mail, dishes, laundry). Seats and the floor in front of them kept clear.
- `rundown`: an apartment the landlord neglects (water-stained ceiling, peeling paint, taped window, stained floor, trash bags). Seats and floor kept clear.
- `morning`, `night`, `rain`: light and weather only.
- `region-<name>`: the same street, square or house rebuilt in a region's own character: `puerto-rico`, `pacific-islands` (Guam, American Samoa, Northern Mariana Islands), `southwest`, `new-england`, `deep-south`, `plains`, `mountain-west`, `alaska`. Places: `main-street`, `rally-town-square`, `door-knocking-suburban`, `door-knocking-rural`. Checked with the place's spots drawn on: all held except `door-knocking-rural__region-pacific-islands`, where the house sits farther back, so that one needs its own spots. Still coming: `rally-town-square__region-southwest`, `door-knocking-rural__region-puerto-rico`.

## New camera (spots must be measured fresh)
The same place seen from another position: the same furniture, colors and light. Spots measured on the midday painting do not apply.

- `view-reverse`: from the opposite side, so the parts behind the original camera show (the doors at the back of the council chamber, statehouse, House and Senate seen from the rostrum, the election-night room seen from the stage behind the lectern, the clerk's side of the counter, the coffee shop's front window, the living room from behind the couch).
- `view-low-corner`: lower and closer, from a corner at a seated person's eye height, with the nearest seat, desk or porch post large in the foreground (a seat-level view for a scene's own seat).

## New places (native 1365 x 768 or 1376 x 768)
- `doorstep-rundown-porch`, `doorstep-suburban-stoop`, `doorstep-apartment-hallway`, `doorstep-mobile-home` (door-knocking doorsteps).
- `town-council-desk__morning`; `county-admin-lobby__evening` is the evening after a board meeting.
- `inaugural-platform` (the West Front platform seen from the Mall) and `inaugural-lectern-close` (a television close shot of the empty lectern with the seal, glass panels and the dome behind, with room above it for the speaker), for the opening's inaugural address.

Generator: Adobe Firefly, Gemini 3.1 (Nano Banana 2), image edit at 1K.
