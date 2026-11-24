---
id: art-house-floor-in-session
title: "A House floor picture with its members for the President's address"
area: art
kind: feature
priority: 1
size: S
status: merged
standard: 2
claimed-by:
pr: #10311
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: design-director-on-core2
source: playtest Nov 23 row C19 ("The House chamber is empty during the address")
checked: sonnet 2026-11-23
merged-at: 2026-11-24T06:46:28.888Z
---

**What.** The address opens in the House chamber and the picture is the empty room, with only the speaker's bust on the strip. The owner reported it on Nov 23. The painted room needs the members in their rows, which no session may draw into it while rooms are paintings with busts. Seen: on the address's first Continue in a new life.

**Cause.** Found in code: `art/backdrops/us-house-floor__*.jpg` are painted empty and `places` in `src/bench/data/opening-montage.json` (read by `pictureOf` in `src/bench/montage.ts`) lists only that picture for the chamber and officials beats; no occupied painting exists (the picture is a gap, `docs/art/WANTED.md` row address-1).

**Fix.** The montage now tries `us-house-floor-in-session` first and falls back to the empty floor; painting that one picture (midday and night) and adding it to `art/backdrops/manifest.json` and `categories.json` is the whole change. No code changes remain.

**Time box.** 1 hour once the picture exists.

**Rules.** Replace, never layer: the occupied picture takes the empty one's place at the front of the same list, not a second lookup. One rule, all 56 places: this is a national room, so no place is named in logic.

**Done when.** A second session sees, in the running game, in a drawn place from all 56, the first beat of a new life's address on the occupied House floor, with the screenshot kept in the pull request and the President's bust on the strip as before.

**Waits on.** The picture, painted by the owner's art session.

**Files.** src/bench/data/opening-montage.json, art/backdrops/manifest.json, art/backdrops/categories.json
