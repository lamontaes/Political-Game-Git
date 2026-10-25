---
id: world-unemployment-rate-names-its-area
title: "The opening night's two unemployment rates say which is the nation's and which is the region's"
area: world
kind: bug
priority: 1
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** On the opening night the President says the nation's unemployment rate and the evening news gives the town's region's rate, and neither says where it applies, so a player reads 4.1 and 4.4 percent as one number twice. The news line labeled the rate with nothing, though the figure is a metro's or the rest of a state's, not the town's. News's economy row printed raw field names (unemploymentPct 4.4) under REGION. This is the buildable half of play-stop-10-two-unemployment-rates-one-night, which stays open for the owner's installed-build check.

**Rules.** No hand-written player text: the scope is a fact in the packet, said by bank pieces (authored ones marked origin authored). Ask why: the area named is the region whose rate is given, from the regional data. One rule, all 56 places: proven in drawn places, each named with its seed.

**Done when.** In a played world (buildBenchWorld, two-level) in a drawn place named with its seed, every opening-night sentence that gives an unemployment rate names its scope: the President's says national, the news's names the region's area, and News's economy row shows the same area; a test in src/director proves it and fails with the old bank sentences; bench screenshots of the opening line, the evening news and the News row are in the PR.

**Files.** src/core2/modules/regional.ts, src/director/opening-story.ts, data/english/parts/newscast.json, data/english/parts/opening-speech.json, src/core2/modules/world-panels.ts, src/bench/play.mjs

**Notes.** TODO
