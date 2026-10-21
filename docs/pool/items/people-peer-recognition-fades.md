---
id: people-peer-recognition-fades
title: "A generated school peer's name fades from memory over the years since school"
area: people
kind: feature
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** Opening school peers are generated as remembering each other's names forever (recognitionStatus generated-remembered-name in src/core2/data/opening-peer-network.json). The Oct 19 research puts name recognition of cohort peers at about 0.9 within 15 years of leaving school and about 0.7 near 50 years (Bahrick 1975; low 0.6, high 0.95). Make remembered-name strength fade with years since the school context, read by whatever greets or recalls a peer.

**Rules.** No dice: the figure is a memory strength that falls smoothly with years, never a chance per person. Every number in a parameter table tagged ESTIMATED with its spread.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a peer from a school cohort 40 years back is recalled with lower strength than one from 5 years back, shown by a test beside opening-peer-network.test.ts naming the place, seed and fact ids.

**Files.** src/core2/opening-peer-network.ts,src/core2/data/opening-peer-network.json,src/core2/data/parameters.json

**Notes.** TODO
