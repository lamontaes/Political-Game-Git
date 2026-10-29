---
id: play-one-painted-places-list
title: "One list of painted places: the opening, stories and filing stop keeping their own, and the capitol picker finds each state's own building"
area: play
kind: bug
priority: 2
size: S
status: done
claimed-by: claude/dup-one-painted-list
pr: #6458
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-28T00:38:33.682Z
---

**What.** Five files each built their own set of the places painted at midday (scene, opening, story, filing and backdrop-places), and the shared capitol picker read a Vite file glob that is empty under the bench server, so it never found a state's own capitol. The opening worked around it with its own check. This is a second engine for one mechanic (duplicates report rows B3 and M14).

**Rules.** Replace, never layer: the four local copies, the Vite glob wrapper and the opening's workaround are deleted in the same change, and every picker reads the one list in backdrop-places.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56, the opening's state stage shows that state's own capitol through capitolPlaceFor, a year on the player's scene picture is painted, and capitolPlaceFor under plain node returns the state's own capitol for all 56 places (it returned 0 of 56 before).

**Files.** src/bench/backdrop-places.ts, src/bench/opening.ts, src/bench/scene.ts, src/bench/story.ts, src/bench/filing.ts

**Notes.** TODO
