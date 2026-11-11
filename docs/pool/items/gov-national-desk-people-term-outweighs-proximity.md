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
standard: 2
model: opus
effort: medium
lead: governing
root: none
source: added with npm run pool -- add
after:
checked: fable 2026-11-10
---

**What.** At the national desk, a state story that names or reaches the outlet's own readers (a people term up to about 4) outranks the nation's institutional records, whose bare nation proximity is 1.0: in place 0815330, seed dc4ca02829931f61516253751229f4eb270be44f, the week of Feb 17 2025, all five national outlets printed a state law at scores 1.54 to 1.67 while a House committee hearing on a Medicaid work-requirement bill, wired with its bill's question and its eleven committee members, scored only nation proximity times 1 plus reader care. Whether the national tier's proximity ordering (nation 1.0 against state 0.5 in src/core2/data/press/parameters.json) should survive the people term, by weighting reach within the tier's own scale or by a sourced news-value finding, is an open calibration question. Found while fixing release-vote-level-federal-story-draw. Seen: the paper, whose national desk stops printing a state law over a House committee hearing for the wrong reason.

**Cause.** Measured: place key 0815330, seed dc4ca02829931f61516253751229f4eb270be44f, the week of Feb 17 2025: all five national outlets printed a state law at scores 1.54 to 1.67 over a House committee hearing scored at nation proximity 1.0 plus reader care (src/core2/press-desk.ts, src/core2/data/press/parameters.json).

**Fix.** Find a cited news-value finding on whether a national outlet writing for one town's readers prints its state's law over Congress's committee markup. Either change the weighting with its own proof, or record the current weights as intended.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** Research before building: real media data decides this, and no parameter moves without a citation. An effect is a read: whatever weighs a story, the desk still reads records.

**Done when.** A second session finds, in the running game in place key 0815330 (seed dc4ca02829931f61516253751229f4eb270be44f), the national desk's choice for the week of Feb 17 2025 matching the sourced finding, either through a cited parameter change in src/core2/data/press/parameters.json with its own proof or through a recorded note that the current weighting is intended; the finding and its citation are in the PR body.

**Waits on.** Nothing.

**Files.** src/core2/press-desk.ts, src/core2/data/press/parameters.json

**Notes.** TODO
