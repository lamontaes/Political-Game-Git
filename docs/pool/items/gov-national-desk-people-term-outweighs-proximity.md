---
id: gov-national-desk-people-term-outweighs-proximity
title: "The national desk's people term can outweigh its own nation-first proximity ordering"
area: gov
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** At the national desk, a state story that names or reaches the outlet's own readers (a people term up to about 4) outranks the nation's institutional records, whose bare nation proximity is 1.0: in place 0815330, seed dc4ca02829931f61516253751229f4eb270be44f, the week of Feb 17 2025, all five national outlets printed a state law at scores 1.54 to 1.67 while a House committee hearing on a Medicaid work-requirement bill, wired with its bill's question and its eleven committee members, scored only nation proximity times 1 plus reader care. Whether the national tier's proximity ordering (nation 1.0 against state 0.5 in src/core2/data/press/parameters.json) should survive the people term, by weighting reach within the tier's own scale or by a sourced news-value finding, is an open calibration question. Found while fixing release-vote-level-federal-story-draw.

**Rules.** Research before building: real media data decides this, and no parameter moves without a citation. An effect is a read: whatever weighs a story, the desk still reads records.

**Done when.** A sourced finding states whether a national outlet writing for one town's readers should print its state's law over Congress's committee markup, and either a cited parameter change lands with its own proof or the current weighting is recorded as intended.

**Files.** src/core2/press-desk.ts, src/core2/data/press/parameters.json

**Notes.** TODO
