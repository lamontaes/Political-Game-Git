---
id: people-pack-v4
title: "Switch the game to people pack v4 (five angles, several looks per person) and the standard Oval Office rooms"
area: art
kind: feature
priority: 1
size: S
status: in-pr
claimed-by: claude/people-pack-v4
pr: #6801
blocked-on: people-pack-v3 (#6778) merged first; this builds on its loader
source: owner, Oct 29 (CTO brief)
claimed-at: 2026-10-29T18:26:18.818Z
---

**What.** Owner, Oct 29: "ship the next model of people so those can start getting plugged into the game." Pack v4 is every v3 row and file plus 65 people drawn on the standard library poses at five angles (front, three-quarter left and right, back three-quarter left and right; never mirrored), in several looks each (suits, ties, shirtsleeves, a dress, hairstyles). Same manifest shape as v3. The `people-pack` skill (in #6778) says a new version replaces the old folder in the same PR.

**The art (branch `claude/people-rooms-art`, commit c11019c; merge only these):**
- `art/people-engine/v4/`: `manifest.json` + `README.md` (read first). New optional fields: `angle`, `hair`, `outfitLabel`, `prop` (v3 rows that hold a phone or paper), `drawnBehindTable` (desk figures whose forearms lie on the desk as drawn; fit them head top to `hands` like v3).
- `art/people-rooms/mannequin-plates/oval-office.mannequins.json` (wide shot, 14 spots: the President at the desk, six couch cushions, five standing spots at different angles, the President standing in front of or behind the desk) and `oval-address-standard.mannequins.json`, with their backdrops `oval-office-standard__midday.png` and `oval-address-standard__night.png` beside them and the `front` masks they name.

**Do.**
1. `PEOPLE_PACK = 'v4'`; delete `art/people-engine/v3` in the same PR; desktop packaging copies v4.
2. Add the two backdrops to `art/backdrops/manifest.json`; the Oval Office and the address use them; retire the `oval-briefing` and `oval-address` plates and backdrops.
3. Depth: draw a scene's people from the farthest spot to the nearest (smallest `feet` row first), so nearer people overlap farther ones; desk spots draw before standing spots in front of the desk.
4. Props (owner, Oct 29): a figure with `prop` is chosen only where that prop belongs (phones at rallies and on the street, paper at a hearing or the address desk, pen and paper at a desk); never at home.
5. Creator: a person's looks list every `look` row by `outfitLabel`, so the same person can be dressed several ways.
6. `needsDesk` (owner, Oct 29: "she has a pen in her hand and she's writing on her green pants"): a figure with it is chosen only for a desk spot (`deskEdge`), cut at the hands, never for a chair, couch or standing spot.
7. `pictures` (frame boxes in a plate): leave them showing plain glass unless the room owner has a family photo to fill them with; never a painted face.

**Time box.** One session, about 2 hours (the loader already exists).

**Done when.** On the PR, from the bench's played world (name the seed): (a) the Oval Office wide shot with the President at the desk, two staff standing and two people on the couches, each on their mannequin spot, nobody on a couch arm; (b) the address: the President's forearms lying on the Resolute desk, fingers whole; (c) the President standing behind the desk (desk hiding the legs); (d) the creator showing one person in at least three looks; (e) a test fails if `art/people-engine/v3` is referenced or packaged; the people-pack tests pass. Proof sheet in the PR; the owner's visual check before merge.

**Files.** `src/bench/people-pack.ts`, `whole-figures.ts`, `mannequin-plates.ts`, `scene.ts` (`stagePeople`), `art/backdrops/manifest.json`, `desktop/scripts/build-play-api.mjs`.

**Notes.** How the rooms and spots were made and measured: the `room-spots` skill (#6784). The CTO keeps adding looks, people and standard rooms as rows and plates; nothing in code should change for them.
