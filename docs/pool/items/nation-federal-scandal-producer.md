---
id: nation-federal-scandal-producer
title: "A federal official's recorded act becomes public through the press, so the President's approval can move by a scandal"
area: gov
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on: nation-federal-scandal-producer-part-1-federal-acts, nation-federal-scandal-producer-part-2-press-reports, nation-federal-scandal-producer-part-3-approval-push
source: added with npm run pool -- add
after:
lead: nation
model: sonnet
effort: low
root: design-story-director
checked: fable 2026-11-10
---

**What.** Nothing produces a federal-level scandal: the corruption engine records bribes by the town's own people only, so the national opinion engine's pushes table has no scandal to read. Add a producer through the existing engines in three parts: an official of the President's cabinet or of Congress commits a recorded act (part 1), the press reports it (part 2), and approval is pushed by the sized effect the research gives (part 3; Iran-Contra 63 to 47 in two months, Watergate 62 to 24 over 21 months, Gallup, news.gallup.com/poll/4258). Seen: the paper's story of a federal official's act and the President's approval number on the Metrics tab.

**Cause.** Design: docs/design/story-director.md, and the Nov 8 Coordinator order to add this producer once disasters were ruled out of approval; `pushOpinion` in src/core2/modules/national-opinion.ts is the writer waiting for it.

**Fix.** Build the three parts in order; this item adds no code of its own.

**Time box.** 2 hours for one Sonnet session, the closing check after the parts. When it runs out, write what was seen in the item and stop.

**Rules.** No dice: the act follows the official's traits, money and chances, never a monthly chance. Knowing is a read: approval moves only for an act the public learned of through the press. One engine: the corruption engine's records, not a second scandal system. A push is sourced, with its half-life from the dated readings.

**Done when.** A second session, not the builder, plays a one-year world (buildBenchWorld) in a place drawn from all 56 on a seed nobody chose and sees a federal official's recorded act reported by the press and the next approval row cite the act's record id and a negative push; src/core2/federal-scandal.test.ts proves it.

**Waits on.** The three parts: nation-federal-scandal-producer-part-1-federal-acts, nation-federal-scandal-producer-part-2-press-reports, nation-federal-scandal-producer-part-3-approval-push.

**Files.** src/core2/modules/corruption.ts, src/core2/modules/national-opinion.ts, src/core2/modules/press.ts, src/core2/federal-scandal.test.ts (new)

**Notes.** Found by Nation, Nov 8: the Coordinator asked for this item when approval moved by disasters was ruled out (Gallup finds little evidence Katrina moved job approval). pushOpinion is the writer waiting for it.
