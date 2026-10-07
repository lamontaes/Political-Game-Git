# Clock and time controls belong to the player card

The owner is asked to review the revised closed and open menu images. The recorded name, bust, clock, date and time controls now sit together inside one bottom-left player card. The eleven-item fan remains unmarked. The person details have no tabs. Neither previous pair was selected; this candidate is not production approval.

## Binding correction and source

The relayed owner order [6009264274](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6009264274) replaces the separate clock surface with date, time and controls inside the player card. [6009261804](https://github.com/lamontaes/Political-Game-Git/issues/2052#issuecomment-6009261804) requires eleven destinations. The no-radial-marks rule from merged #2285 remains.

Session3 received the correction [directly on its card PR](https://github.com/lamontaes/Political-Game-Git/pull/2296#issuecomment-6009295757). Its recorded name, age, work and household text remain unchanged in [recorded-content.json](recorded-content.json) and [card-content.js](card-content.js). The existing people-engine layer recipe in [art-recipe.json](art-recipe.json) supplies the bust; no new character art was generated.

The released rural-farmhouse morning image replaces the city-block apartment review stage because its window shows rural scenery. This is a candidate stage for Scarville, not a claim that Brianna lives on a farm or is in this room. Session3 was asked for the exact recorded room and artwork. No game records were created.

## Measured checks and next decision

The native 1920×1080 browser images have no checked viewport clipping or text overflow, eleven visible destinations when open, zero radial marks, and clock/actions inside the player card. These measured results are in [fit.json](fit.json). The fan and details panel were raised to clear the taller player card. Repository Prettier passed every added supported file, including JSON; [terminal output](prettier-terminal.txt) records that check.

The owner’s choice remains pending. These are static game-art overlays, not fresh live-game screenshots. Tilted labels remain a readability risk and the fan covers part of the table. Matching the exact recorded room remains pending from Session3. No simulation or production source code changed.
