---
id: nation-federal-scandal-producer-part-2-press-reports
title: "The press reports a federal official's recorded act and names it by record id"
area: gov
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: nation-federal-scandal-producer-part-1-federal-acts
blocked-on:
lead: nation
model: sonnet
effort: medium
root: design-story-director
source: split from nation-federal-scandal-producer in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** Once a federal official's act is recorded, the press must be able to learn of it and run it, because the public learns of an act only through the press. Today the tip-off path reads only the town's own outlets and crimes. This is part 2 of nation-federal-scandal-producer. Seen: the paper's story of a federal official's act.

**Cause.** Found in code: `tipOff` in src/core2/modules/press.ts (line 2490) and `reportersHere` take a crime record and the town's outlets' reporters only, so a federal official's act has no path to a story.

**Fix.** Let the same tip-off, dig and run decisions (`weighTip`) take a federal official's recorded act, with the town's outlets carrying it as national news, and name the act's record id on the story.

**Time box.** 5 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Knowing is a read: the public learns of an act only through a story. No dice: reporters and owners decide by their traits, closeness and the paper trail the act left. One engine: the existing press path, not a second one.

**Done when.** A second session, not the builder, plays a one-year world (buildBenchWorld) in a drawn place on a seed nobody chose and sees a story that names a federal official's recorded act by its record id, with the tip, the dig and the run decisions behind it; src/core2/federal-scandal.test.ts proves it.

**Waits on.** nation-federal-scandal-producer-part-1-federal-acts.

**Files.** src/core2/modules/press.ts, src/core2/federal-scandal.test.ts (new)
