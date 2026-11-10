---
id: director-opening-as-a-scene-part-2-cutaways-from-records
title: "Every opening cutaway is the town's own business with its people"
area: director
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after: director-opening-as-a-scene-part-1-find-what-is-left
blocked-on:
lead: director
model: opus
effort: high
root: design-director-on-core2
source: split from director-opening-as-a-scene in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The opening's cutaways were stock rooms with nobody in them, chosen by the sentence's topic rather than from the town's records. In Iowa City, Iowa, seed 28c0b8150290, all four stood empty. Each cutaway must be the town's own business for the fact with the people who work there.

**Cause.** Design: docs/reports/opening-root-cause-2026-10-27.md (cutaways chosen by topic, not from the town's records). The list of what is left comes from part 1.

**Fix.** Make each cutaway's setting an organization record id in the town (the business for the fact), with the people who work there cast from their job records, and the home frames use the evening. Delete the stock-room choice.

**Time box.** 6 hours for one Opus session.

**Rules.** Wire to the world: each cutaway is the town's own business for the fact (the organization record) with the people who work there. One rule, all 56 places: no place, picture or office is named in logic. Replace, never layer: the topic-keyed choice is deleted in the same change.

**Done when.** A second session plays the opening in a drawn place and seed it names (buildBenchWorld, not the builder's choice) and finds every cutaway's setting naming an organization record id in that town with at least one cast person whose job record is at it. It checks Iowa City, Iowa (seed 28c0b8150290) and one more drawn place, and no cutaway is empty.

**Waits on.** Part 1 (director-opening-as-a-scene-part-1-find-what-is-left) for the list of what is left.

**Files.** src/director/opening-story.ts, src/bench/opening.ts, src/bench/scene.ts
