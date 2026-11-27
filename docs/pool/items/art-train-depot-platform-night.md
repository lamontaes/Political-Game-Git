---
id: art-train-depot-platform-night
title: "The train depot platform is painted at night, so the address's America cutaway matches its evening"
area: art
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
source: "CTO, Nov 19, 2026, 10:52Z on #9747 (approving #10268): leaving the midday light is fine, since it needs a painting, so file it as an art item"
model: sonnet
effort: low
root: none
---

**What.** The President's address on the opening evening cuts away from the House floor to America, on the train depot platform. The platform is painted only at midday, so an address given at night shows a sunny platform between two night pictures (the Player's beat 3 at #9995, Nov 19 09:40Z). Seen: the second picture of the President's address on the opening evening, the platform at night.

**Cause.** Found in code: `art/backdrops/manifest.json` has one row for `train-depot-platform`, `train-depot-platform__midday.jpg`, and `backdropFor` in `src/bench/scene.ts` falls back to the only painted light. `src/bench/data/opening-montage.json` names the platform as the America beat's picture.

**Fix.** Paint or generate `train-depot-platform__night.jpg` in the standard camera, matching the midday picture's layout so its mannequin plate still fits, and add its row to `art/backdrops/manifest.json` with its source and parent (skill `asset-scene-admission`). No code change: `backdropFor` picks the night light once it is painted.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Preserve asset originals, hashes and lineage. A missing picture never holds work back (owner, Nov 14): until this lands the midday picture stands in. Replace, never layer.

**Done when.** A second session starts a new life in a drawn place with `npm run bench` (place and seed named), presses Continue through the President's address on the opening evening, and sees the America cutaway on the depot platform at night between the House floor and home; `node src/bench/opening-montage.browser.mjs` passes and logs `train-depot-platform__night.jpg`.

**Waits on.** Nothing.

**Files.** art/backdrops/manifest.json, art/backdrops/train-depot-platform__night.jpg (new), src/bench/scene.ts, src/bench/data/opening-montage.json
