---
id: world-disaster-names-the-executives
title: "A disaster record names the sitting executives of the places it hit, so their first hours can be a scene"
area: world
kind: feature
priority: 2
size: S
status: open
claimed-by: 
pr:
blocked-on:
source: words-and-scenes helper D, Oct 27; probes of governors' and mayors' played years in Prospect and Hindman, Kentucky, Graball, Tennessee and Bismarck, North Dakota
lead: laws-effects
claimed-at: 
---

**What.** The hazard record for a declared disaster is written with no people on it (personIds empty), and in the probed years it appeared one to four times a year (four in Prospect and Hindman, Kentucky) without any executive's moments changing. Name the sitting mayor of an affected town, the county executive of an affected county and the governor of the state in personIds, and carry the disaster number and title in the facts it already has, so a first-hours scene can find its executive and its place. Until then an executive's first hours of a disaster cannot be a scene.

**Rules.** Wire to the world: the record is read by the director, which stages a scene. No dice: who is named is whoever holds the office on the day it is recorded. One rule, all 56 places: no place is named in the change.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a year that records a disaster shows it naming the sitting executive of each affected government who is a full person, and the director holds a moment from it for that executive; a test fails when an affected executive is missing from personIds.

**Files.** src/core2/modules/disasters.ts, src/director/data/director.json

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md. Lead laws-effects.
