---
id: world-executives-meet-in-records
title: "A meeting between two executives (mayor and governor, governor and president) is recorded, so it can be a scene"
area: world
kind: feature
priority: 3
size: M
status: open
claimed-by: 
pr:
blocked-on:
source: words-and-scenes helper D, Oct 27; owner, Oct 27: meeting with this executive, that executive
lead: laws-effects
claimed-at: 
---

**What.** The only recorded meeting of an executive is the governor's weekly meeting with the legislature's leaders on the state office day; nothing records an executive meeting another executive, though the owner asked for a mayor and the governor, and a governor and the president. Add a recorded meeting where the law and the world give one a cause: a governor's disaster request to the president that the federal aid table already carries, a mayor and the governor over a state grant or a shared disaster. The record names both and the cause record that brought them together.

**Rules.** Simulate it, don't ask: executives meet when a recorded cause (a disaster, a grant, a mandate) puts a decision between their governments, never on a timer or a chance. Wire to the world: the meeting is read by the director, which stages a scene. One rule, all 56 places: no place is named.

**Done when.** In a played world (buildBenchWorld) in a drawn place and a seed the builder did not choose, a year with a recorded disaster shows a meeting record naming the governor and the affected town's mayor with the disaster record as its cause, and the director holds a moment for each; a test fails when the cause is removed.

**Files.** src/core2/modules/executive.ts, src/core2/modules/disasters.ts, src/core2/modules/meetings.ts

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md. Depends in practice on world-disaster-names-the-executives. Lead laws-effects.
