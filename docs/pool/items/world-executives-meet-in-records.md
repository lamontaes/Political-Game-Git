---
id: world-executives-meet-in-records
title: "A meeting between two executives (mayor and governor, governor and president) is recorded, so it can be a scene"
area: world
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by: 
pr:
blocked-on:
after:
model: sonnet
effort: medium
root: design-director-on-core2
source: words-and-scenes helper D, Oct 27; owner, Oct 27: meeting with this executive, that executive
lead: laws-effects
claimed-at: 
checked: fable 2026-11-10
---

**What.** The only recorded meeting of an executive is the governor's weekly meeting with the legislature's leaders on the state office day; nothing records an executive meeting another executive, though the owner asked for a mayor and the governor, and a governor and the president (owner, Oct 27). Add a recorded meeting where the law and the world give one a cause: a governor's disaster request to the president that the federal aid table already carries, a mayor and the governor over a state grant or a shared disaster. The record names both executives and the cause record that brought them together, and the director holds a moment for each.

**Cause.** Design: docs/design/scenes/from-life/executive-record-gaps.md and the owner's Oct 27, 2026 request that executives meet; the one existing meeting kind is in src/core2/modules/meetings.ts.

**Fix.** Record a meeting naming both executives and the cause record (disaster request, grant, shared disaster) in src/core2/modules/meetings.ts, called from the executive and disaster modules, and add the director moment for each executive.

**Time box.** 5 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: a scene of a mayor and the governor, or the governor and the president, meeting over a disaster request or a grant (the owner asked for it).

**Rules.** Simulate it, don't ask: executives meet when a recorded cause (a disaster, a grant, a mandate) puts a decision between their governments, never on a timer or a chance. Wire to the world: the meeting is read by the director, which stages a scene. One rule, all 56 places: no place is named.

**Done when.** A second session (not the builder) plays a world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose, through a year with a recorded disaster, and sees a meeting record naming the governor and the affected town's mayor with the disaster record as its cause and the director holding a moment for each; a test fails when the cause is removed.

**Waits on.** world-disaster-names-the-executives.

**Files.** src/core2/modules/executive.ts, src/core2/modules/disasters.ts, src/core2/modules/meetings.ts, docs/design/scenes/from-life/executive-record-gaps.md

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md. Depends in practice on world-disaster-names-the-executives. Lead laws-effects.
