# LOCATIONS: every painted place in the game, used where it belongs

> **History.** This describes the old engine or a process that ended in October 2026. Don't follow it; read `AGENTS.md`, `ARCHITECTURE.md` and `docs/README.md`.

Owner: Lamontae. Written by the Opus CTO on Oct 13, 2026, from the code at main `d39511ac2` and a full listing of the Firefly library.

You are the one session that owns **places**: the paintings behind every scene. Your job is to:

- take every place painting the CTO brings out of Firefly into the repo;
- put each one in the game where it belongs, tagged in the game's own system and staged so people can stand and sit in it;
- make the game choose among them, so the player stops seeing one house, one chamber and one governor's office.

You don't touch people figures (who is drawn, poses, facing, shadows) or menus and panels. Other sessions own those.

## What the owner said (Oct 13, about 3:50 p.m.)

- "why is there only one house? I only ever see this one house… If you look in Firefly, there are hundreds of images waiting. Why is there only one house? There isn't only one house, but why is only one being used? Like I said, there's only one chamber and shit."
- "we're using one governor office, why… one gubernatorial office, why?"
- "why is the president not in the White House? Why are the governors not in their mansions?"
- "Why would you need to visit the market? … It's stupid."
- On the filing office (screen 43): "the thing in the back. What fucking state is that?" The map on the wall is painted into the clerk's-office picture and shows no real state.
- "I want one session just doing straight Firefly shit. So getting all the images, and putting them in the game where they belong. And marking them with the game's tagging system… all the location shit goes to one session."

The 97 screenshots he reacted to are on branch `cto/ui-screens-2026-10-13`, folder `screens/2026-10-13/`. Look at them before you start.

## How places work today (read these files first)

- **`art/backdrops/manifest.json`**: every painted place. There are 487 pictures of 178 places.
  - Variants: midday 178, morning 100, rain 97, night 95, winter 17.
  - A row looks like: `{"place":"appellate-courtroom","variant":"midday","file":"appellate-courtroom__midday.jpg","width":1672,"height":941,"sha256":…,"sourceFile":…,"sourceSha256":…,"approval":…,"tags":["kind:appellate-courtroom","uses:shared-location"]}`.
  - Tags are `kind:<place>` and `uses:<…>` on every row, plus domain tags on some (employer, public-safety, recreation, office-work and so on). This is the game's tagging system. Extend it; don't invent a second one.
- **`art/backdrops/staging.json`**: where people can be in each place.
  - Each place has `horizonY`, `metersPercent`, optional `floors`, and `spots`.
  - Each spot has `x`, `y`, `pose` (stand, sit, lean, podium), `facing` (viewer, away, left, right), `role`, `hero`, and `clipBelowY`/`seatY` for seats.
  - All 178 places are staged. A place without staging can't hold people, so every new place needs it.
- **`art/backdrops/surfaces.json`**: the painted screens, posters and papers that show live game content.
- **`art/campuses/manifest.json`**: the 52 college campuses (`src/presentation/campus-backdrops.ts` chooses one). They have **midday only**.
- **`src/presentation/place-backdrops.ts`**: `homePlaceFor`, `workplacePlaceFor`, `capitolPlaceFor`.
- **`src/bench/data/scene-places.json`**: which picture shows what a person is doing. Its keys:
  - `actions`, `organizationKinds`, `placesWithoutKind`, `variantByHour`, `filingOffices`;
  - `sceneSettings`, `bodyPlaces`, `speechPlaces`, `dwellingPlaces`, `regionalHouses`, `situationPlaces`, `schoolPlacesByAge`, `electionNight`.
- **`src/bench/scene.ts`**:
  - `homeOf()` picks a home picture from the household's dwelling kind and the state.
  - `scenePlace()` and `backdropFile()` pick the place and the variant by hour.
- **`src/bench/places.ts`**: the Travel list (`townPlaces`), which lists every organization in town that has a picture.
- **`src/bench/opening.ts`** and `src/bench/data/opening-shots.json`: the intro shots.

## What is wrong (checked in the code)

1. **One house.** `dwellingPlaces.house` is `["suburban-house"]`. Only 15 states add a regional style (`regionalHouses`: New England colonial, Gulf Coast raised, Southwest adobe, Northwest craftsman). Every house household in the other 35 states gets the same picture. `large-house` is painted but in no list.
2. **One home interior.** The home scene is that same picture for everyone in the household. There's `home-kitchen` and `bedroom-teen`, but no living room set to choose from.
3. **President and governors live in ordinary houses.** `homeOf()` reads only the household's dwelling, so it never uses the official residence.
   - There is one `governor-office` for all 50 states, one `governor-residence-exterior`, and no residence interior.
   - The White House has `white-house-exterior` and `oval-office`.
4. **One of each chamber.** There's one `council-chamber`, one `county-commission`, one `state-legislative-chamber-bicameral` and one `-unicameral`, plus `us-house-floor` and `us-senate-floor`.
5. **County government has almost no buildings.** In the game: county clerk (rural, urban), county commission, county courthouse, county courtroom, county party office, a fairground rally.
6. **Campuses have midday only.** Firefly holds their morning, night, rain and winter versions.
7. **Travel lists pointless trips** (the market) because `townPlaces` lists every organization with a picture.
8. **The filing office's wall map** is a fixed painted map that isn't the player's state.

## What is waiting in Firefly

- The library has **2,938 images**. I listed 2,800 of them on Oct 13; one page of 100 didn't load, so list it again.
- The inventory with asset ids is in `locations-firefly-inventory-2026-10-13.json`, next to this doc. Its statuses:
  - **new-place**: 247 images of about 114 places the game doesn't have. Names are cut short in Firefly, so a few are already in under a longer name; check each one.
  - **new-variant**: 84 images, a new time or weather for a place the game already has.
  - **campus-variant**: 208 images.
  - **capitol-variant**: 195 images. Check them against the 59 capitols' variants already in the manifest.
  - **in-game**: 174 images, already imported. Skip these.
- The new places, grouped:
  - **County**: courthouses in six styles (classical, Romanesque, modern, rural, Southwest, New England), a rural county commission room, county admin lobby, sheriff's office (inside, front desk, outside), jail (booking, visiting, outside), treasurer, recorder, elections office, district attorney, public defender, family/probate court, fairgrounds and exhibit hall, health department, emergency operations, extension office, road garage, courthouse square and steps.
  - **City and state**: large and small city council chambers, a state house chamber, committee hearing room, capitol hallway, congressional office, permit office, public works garage, water treatment, registrar of voters, big-city elections office, polling place outside, a protest at the capitol, city hall steps.
  - **Federal**: the Oval Office with the Resolute desk, more Oval Office takes, more governor residence takes.
  - **Homes**: suburban living room, rural house kitchen, trailer home living room, and apartments (kitchen, nice, rundown, starter, public housing, student shared), plus a bedroom.
  - **Town**: airport, bus stop, train platform, post office, pharmacy, doctor's exam room, clinic, daycare, food bank, homeless shelter, emergency shelter gym, nursing home, VFW hall, veterans office, unemployment office, workforce center, benefits office, lawyer's office, newsroom, TV debate green room, steakhouse private room, distillery, factory outside, farm field, farmers market, community garden, playground, Little League field, rec center pool, school auditorium and library, high school outside, main street, strip mall, river bridge, highway interchange, power plant, solar farm, wind farm, flooded street, tornado damage, recycling center, road work.
  - **Title art**: Lincoln Memorial at night, and Kentucky capitol flags (a test).
- Firefly names start with a `[key]` (for example `[C05-county-courthouse-southwest-midday]` or `[place-playground]`), cut off at about 30 characters. The rest of the name is the prompt's start.

## Getting the images

- **The CTO does all Firefly work.** That means moving the existing images out of the owner's old Adobe account and painting new ones on the new account.
- The CTO commits images to **`art/incoming/firefly/`** in the repo, as full-size JPEGs (mostly 1376×768) named `<firefly-key>__<first 8 of asset id>.jpg`.
  - `art/incoming/firefly/index.json` has one row per image: `file`, `assetId`, `key`, `status`, `place` (best reading of the cut-off key), `variant`, `gamePlace` (the existing place, for new variants), `created` and `fireflyName`.
  - On Oct 13 the CTO moved 708 images: every new-place, new-variant, campus-variant and capitol-variant image in the inventory. The game already has the rest.
  - There are often two or three takes of one key. Keep the best one and note the others as rejected in your PR.
- Import from there. When a place you need isn't in the inbox yet, list it in your PR's gap table, keep going, and pick it up when it lands.
- **If your session has the Adobe connector signed in to the owner's old Adobe account,** you may also pull directly:
  1. `adobe_mandatory_init`.
  2. `asset_search` with `entityScope: "GenAIAsset"`, `sortBy: "createDate"`, `limit: 100`, and `offset` from 0 to 2,900.
  3. `asset_get_presigned_urls` with `[{id, sourceType:"acp", renditionUrl}]`. This returns a `downloadUrl` that `curl -L` fetches as a full PNG.
- **Delete each inbox file in the same PR that imports it,** so the inbox only ever holds what's still waiting.

## Steps

1. **Take** every new-place, new-variant, campus-variant and capitol-variant image from the inbox. Work through the places that fix what the owner named first: houses and home interiors, official residences, chambers, county buildings.
2. **Look at each one at full size.** Reject only real defects: lettering, extra or missing limbs on painted people, real people, branches through leaves, trees hanging in from the edge, or the wrong material or color for a real building. Keep good mistakes as the place they really show.
3. **Name each place** by what it is, in the manifest's style (`county-sheriff-office`, `house-suburban-living-room`). Don't keep the Firefly code prefix.
4. **Import** at the backdrops' size, 1672×941 JPEG, quality about 88, as `<place>__<variant>.jpg`.
   - Add a manifest row with `sha256`, `sourceFile`, `sourceSha256`, `approval: "owner-placeholder-2026-10-13"`, and tags (`kind:<place>`, `uses:<…>`, and every domain tag that fits).
   - Campus variants go into `art/campuses/manifest.json`.
   - Never use the community-meeting title painting.
5. **Stage** every new place in `staging.json`, using the existing entries as the model:
   - Standing spots go where people really stand: by a counter, a desk, a doorway or a wall. Not in the middle of the floor.
   - Seats go exactly where the painted chairs and benches are, with `seatY` and `clipBelowY`.
   - Spots face each other or face the front of the room. Use `viewer` only where a person would really face out, like a speaker at a podium.
   - Mark roles (speaker, member, clerk, judge, deputy, general).
   - Then add live surfaces to `surfaces.json`.
6. **Wire every place to where it belongs**, as data the game reads, never a hard-coded place:
   - **Homes:**
     - Every dwelling kind gets every fitting picture, inside and out: houses, the large house, rowhouse, farmhouse, mobile home and trailer living room, and every apartment kind.
     - Regional house styles stay by state, and the plain styles work everywhere.
     - The household's own id keeps its picture the same every time (`homeOf` already hashes it).
     - At home, a person is in a room that fits what they're doing: the kitchen, the living room, or their bedroom (a teen's bedroom for a teen).
   - **Official residences and offices:**
     - A sitting president's home is the White House, and they work in the Oval Office.
     - A sitting governor's home is the governor's residence, and they work in the governor's office.
     - Read the officeholder from the offices records (`core2-offices-v1` terms) in `homeOf` or the scene choice.
     - List what's missing (residence interiors, more governor offices) for new paintings.
   - **Chambers:**
     - Small or large council chamber by the size of the council or town.
     - Rural or standard county commission room.
     - The state house chamber for a state's lower house, alongside the existing chamber pictures.
     - Committee hearings in the hearing room.
     - Members of Congress in their congressional office.
   - **County government:**
     - Each county office the game records (sheriff, clerk, treasurer, recorder, assessor, elections, district attorney, public defender, courts, health, emergency management, extension, roads, jail) gets its building, through `organizationKinds`, `placesWithoutKind`, `bodyPlaces` and `filingOffices`.
     - The courthouse style follows the region.
   - **Everything else:** businesses and services through `organizationKinds`; events (flood, tornado, protest, debate) through `situationPlaces` and `sceneSettings`; the title and intro art where `opening-shots.json` and the title choose a scene.
7. **Travel** lists only places the player has a reason to go: where they work or study, where they have business (filing, a meeting, an appointment), where people they know are, and government places for their role. Not every organization with a picture.
8. **The filing office:** use a clerk's office picture without a wall map, or a variant for the player's region. List it for a new painting if none fits.
9. **Gaps** go in a table in your PR for the CTO to paint on the new account. Don't paint anything yourself, and don't invent effects. Include:
   - governor residence interiors;
   - more governor offices, by region or era;
   - state legislature chambers that look like the real states' chambers;
   - more house styles for regions with none (Midwest, Mountain, South Atlantic, Appalachia, Plains);
   - more living rooms and kitchens by income;
   - morning, night and rain variants for every new place.

## Proof and rules

- **Proof:** for each PR, screenshots from a fresh game in at least four random places (`buildBenchWorld`, the way `tests/golden-path/played-world.node-test.ts` builds it). Show the home inside and out, a workplace, and each government room the player can reach, before and after.
  - Show the president's and a governor's residence and office.
  - Show two households in the same town getting different homes.
- **One PR per area,** so each merges as soon as it's ready: homes, official residences, chambers, county buildings, campus variants, town and other places, Travel.
- Each PR gets a release note in `docs/release/changes/`.
- **Checks:** prettier, eslint and tsc on changed files, plus the changed tests (`place-backdrops.test.ts`, `campus-backdrops.test.ts`, the backdrop count test, and the played-world test). Never run the whole suite.
- American English.
- No hand-written player text. Labels come from records.
- Never a real politician.
- Never hard-code a place for a person. It always comes from data and records.
- Open each PR ready, not as a draft. The CTO's merge queue merges any ready PR with no conflicts.
