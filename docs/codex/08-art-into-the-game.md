# Job 08: art into the game

Wait for Claude CTO's image delivery. The approved images are in Adobe Creative Cloud (Firefly generations). Claude CTO downloads them to a local folder and names that folder in this job's first message; Codex does not need Adobe access.

## What is coming

1. **Places.** About 70 story places in the game's illustrated background style, each at midday, morning, night and rain, all 16:9. Each file is named `place-<kind>__<time>.png`. Examples:
   - the Federal Reserve boardroom, a federal courtroom, a county clerk's office, a mayor's office;
   - a church, a funeral home, a jail visiting room, a bus stop;
   - apartments from run-down to nice, a trailer, a farmhouse kitchen;
   - elections offices, council chambers, a state house chamber;
   - a campaign office, rallies, a convention floor;
   - a diner, a library, a newsroom, a main street.

   Plus capitols, college campuses by climate, and earlier backdrops already in the repository.

2. **People.** Sheets of three bare-headed figures (three body sizes), for men and women:
   - 9 standing poses (wave, clap, coffee, papers, phone, point, thinking, cheering, listen);
   - 6 seated poses (hands folded, leaning back, listening forward, phone, reading, writing);
   - back views of the standing poses;
   - each in 6 outfits per gender. Women: casual, formal pantsuit, cardigan and jeans, hoodie and jeans, dress and blazer, scrubs. Men: casual, suit, polo and khakis, hoodie and jeans, sweater and collar, work jacket.

## Work

1. **Places as backgrounds.**
   - Import each painting with metadata: kind, inside or outside, region and climate fit, time of day, weather.
   - Extend `scripts/art-asset-factory/import-capitol-backdrops.mjs` or write a sibling importer.
   - Keep the originals and hashes, with source-to-derivative lineage (`AGENTS.md`).
2. **A scene picks its background** from the place's own kind, its region and climate, and the game's clock and weather. No Kentucky scene may show a cactus. Where no painting of that kind exists, fall back to the nearest kind and log the gap.
3. **People.**
   - Cut each sheet into single figures with the approach in `/Users/lamontae/political-game-play/cto-notes/firefly/poses/cut_poses.py` (canvas 1024x1536, head fixed).
   - Build the people pack with `scripts/appearance/build-people-pack.ts`, keyed by gender, body size, pose, outfit and facing (front or back).
   - Faces and hair stay the appearance engine's layers.
   - Existing pack files must not change; diff against `art/people-engine/v1`.
4. **A scene poses its people.**
   - **The pose** comes from what the person is doing: speaking, listening, working at a desk, waiting, cheering. Tag poses by temperament too; Lamontae asked for a shy person and a brash person to stand differently, and the picker reads the person's traits.
   - **The outfit** comes from their job, the occasion, their money and the season, and stays the same everywhere they appear in a day. In the playtest, the President wore a blazer in the scene and a hoodie in her dossier.
   - **Facing** comes from where they stand relative to the player.
5. **Scale.** People were too small in the playtest. Size figures to the scene's floor line so an adult stands at a believable height in the painting.

## Checks

- Browser screenshots of the opening, the home, a council meeting, the county clerk's office and one outdoor scene, each at two times of day. They go in the hand-back.
- The art gates for changed assets.
