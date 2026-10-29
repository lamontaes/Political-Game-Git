---
id: people-pack-v3
title: "Remove the v2 people completely and draw people from pack v3, on mannequins only, swappable by one setting"
area: art
kind: feature
priority: 1
size: M
status: dropped
claimed-by: claude/people-pack-v3
pr: #6778
blocked-on:
source: owner, Oct 29 (CTO brief)
claimed-at: 2026-10-29T16:18:04.410Z
---

**What.** Owner, Oct 29: "i want the v2 figures removed completely and these put in the game"; "make it to where these can be updated very easily. so either a v4 version or more clothes or anything like that. make it a quick fix." Rulings: no face drawn separately (Oct 28); "do not put people in until there are mannequins in there for every position" (Oct 28); a room with no mannequin plate shows nobody (Oct 29); ship six people now, six more faces follow as manifest rows (Oct 29). Replaces `people-swap-week-figures`.

**The art (branch `claude/people-rooms-art`; merge only these folders):**

- `art/people-engine/v3/`: `manifest.json` + `README.md` (read first). Six people, 295 figures. `kind: kit` = everyday clothes as stacked parts with tone maps (recolor per README); `kind: look` = suits, pantsuits and blazers drawn whole (never recolored). Each figure: `pose`, `seat`, `facing`, `dress`, `outfit`, `head`, `feet`, `stature`.
- `art/people-rooms/mannequin-plates/`: per scene `<scene>.mannequins.json` + `front` masks (README there). The first five: home (house-suburban-living night), colonnade, depot, oval-briefing (oval-office-resolute midday), oval-address (new backdrop `oval-address-close__night.png`, add it to art/backdrops). Copy the colonnade and depot backdrops from `art/backdrops-variants/`.

**Do.**

1. One loader `src/bench/people-pack.ts`: a constant `PEOPLE_PACK = 'v3'` (the only place a version is named) reads `art/people-engine/<pack>/manifest.json`. Everything else reads the manifest, never file names. More clothes or people = more rows; v4 = a new folder + this constant.
2. Person → figure: person id from sex and build (the person's saved look, else a hash of their id); dress from the place (keep `dressFor`: official places and own workplace → a `look` by dress, else `kit` casual); kit colors from the person's `palettes` (saved look, else seeded).
3. Staging: a spot draws a person only if its scene has a mannequin spot; pick the figure whose `pose` matches (then `facing`, then `seat`); fit per the plate README (head top → feet, or head top → hands for `deskEdge` spots, head centered on `head.x`); draw the room back through `front`. Scenes without a plate draw nobody. Never mirror a figure.
4. Faces: the talk box, person card, portraits, government grid, title bust and creator crop the figure's own head (`head` box); no face picture anywhere.
5. Character creator: the six people, outfit (everyday or a look), and colors from the palettes.
6. Delete: `art/people-engine/v2`, `art/people-engine/v1`, `art/people-whole`, `art/people-rooms/poses`, `src/bench/figure-hair.ts` face and hair layering, `figure-heads.json`, v2 garment code, the v2 prefix in `art-check.ts`/`scene-check.ts`, v2 tests (replace with v3 ones); desktop packaging copies only the v3 folder and the plates.

**Time box.** One session, about 4 hours. If the staging part runs long, ship 1, 2, 4, 6 with the mannequin gate (nobody drawn) and say so in the PR.

**Done when.** On the PR, from the bench's played world (name the seed): (a) screenshot of the opening home at 8:30 PM: the couple on the couch fitted to the home plate, no v2 figure; (b) the oval-address scene: the President behind the Resolute desk, hands on the desk; (c) talk box and person card show a v3 person's own face, cropped; (d) the creator shows the six people with outfit and color choices; (e) a room with no plate shows nobody; (f) a test fails if any file under `art/people-engine/v1`, `v2` or `art/people-whole` is referenced or packaged; a test proves a new manifest row appears in the creator with no code change. Proof sheet in the PR; the owner's visual check before merge (OD Oct 28).

**Files.** `src/bench/whole-figures.ts`, `scene.ts` (`stagePeople`, `looksOf`, `faceOf`), `figure-hair.ts`, `figure-colors.ts`, `appearance.ts`, `handler.ts`, `card.ts`, `government.ts`, `play.mjs`, `ui/headshot.mjs`, `scripts/people/room-spots.ts`, `desktop/scripts/build-play-api.mjs`.

**Notes.** The CTO keeps adding mannequin plates (golden path first) and the six second faces as rows; nothing in code should change for either.

- 2026-10-29 (claude/people-pack-v3, last sha 11d05efe1a): in PR #6778, ready, waiting on the owner's visual check; not merged. Art owed as data: man-heavy address and desk figures; furniture-only front masks for the seven dropped spots; everyday figures for every pose.

Oct 29 (CTO): dropped, superseded by `people-pack-v4` (owner: "I can ignore V3 because V4 changes how... there's going to be some standardized angles for people to slot into"). #6778 closed unmerged; its loader, staging, face crops, creator, measure-hands script and the v1/v2 deletions carry into the v4 PR on the same branch line.
