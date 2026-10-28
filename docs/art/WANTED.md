# Art wanted

The one list of pictures the game needs generated, kept by the sessions that stage scenes (the director engineer, the words lead, the finisher, the people-in-rooms builder) and worked top down by the owner's local Opus session, which generates the art (owner, Oct 28: "start a list/tally of scenes it needs generated along with suggested tags, situation, etc. so my local Opus session can generate them... not everything is always super neat... let's start populating the game").

How it works:

- **Who adds a row:** any session whose scene, screen or proof needs a picture that `art/backdrops` (312 place types, 922 paintings by time of day and weather) or `art/people-engine` does not have, or has only once where variety is needed. The director engineer owns the file; the others append and the director reviews each pass.
- **Where rows come from:** the scene web's rows (`npm run scene-web`, docs/reports/scene-web.md) whose place or spot has no painting; the scenes-from-life episodes (`scenes-from-life` skill, docs/design/scenes/) whose setting is missing; the realistic-lives trace (drawn people's lives in a played year: where they live, work, wait, grieve, celebrate) whose places have one painting or none; the owner's sittings.
- **Multi-purpose first:** a row names every situation type and screen that would use the picture; a picture used by five rows outranks one used by one. Variants of a place are rows too: condition (rundown, plain, nice), time of day (morning, midday, night), weather (rain, snow), occupancy (empty, a few, crowded), region (a Puerto Rico street is not a Montana one).
- **The local session marks a row done** with the branch and file names when the picture is pushed to `claude/people-rooms-art` (or its successor); the builder moves it into the game and strikes the row. Nothing about rights or licenses anywhere.
- **Tally** at the top: wanted, generated, in the game, by kind.

## Tally (update with every pass)

| Kind                                                 | Wanted | Generated, not in game | In the game     |
| ---------------------------------------------------- | ------ | ---------------------- | --------------- |
| Backdrops (new place types)                          | 0      | 0                      | 0               |
| Backdrop variants (condition, time, weather, region) | 0      | 0                      | 0               |
| Mannequin plates (spots per scene)                   | 0      | 0                      | 16              |
| Figures (poses, angles, ages, builds)                | 0      | 0                      | 24              |
| Hair, faces, garments                                | 0      | 0                      | 288 / 210 / 324 |

## Rows

One row per picture. Columns: id; kind; place or figure; variant (condition, time, weather, occupancy, region); situation types and screens that use it (ids from `src/director/data/situation-types.json` and the screen names); spots needed (how many people, doing what, facing where); suggested tags for the generator; source (scene web row, episode, trace, sitting); priority (1 = fires in a played year with no picture, 2 = variety where one picture repeats, 3 = nice to have); status (wanted, generated: branch and file, in game: PR).

| id  | kind | place or figure | variant | used by | spots | tags | source | priority | status |
| --- | ---- | --------------- | ------- | ------- | ----- | ---- | ------ | -------- | ------ |
