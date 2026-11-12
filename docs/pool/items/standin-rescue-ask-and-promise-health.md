---
id: standin-rescue-ask-and-promise-health
title: "After a rescue, what the rescuer asks follows the player's care need, and a promise to see a doctor books a care visit"
area: people
kind: wiring
priority: 3
size: M
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: effects
standard: 2
model: opus
effort: medium
root: design-life-record
---

**What.** Stand-ins SG-WORDS-rescue-ask-unrecorded and SG-WORDS-rescue-promise-unread. After a housemate gets help for the player, the rescuer asks for a ride to the doctor, a visit or to stay close in words picked for every rescue, not from what the player's illness calls for, and a promise to see a doctor books no visit and warms no tie. Seen: in what the rescuer asks and the care visit that follows a promise.

**Cause.** Found in code: src/director/rescue-facts.ts rescueFacts (line 29) builds only who rescued, a child in the room and witnesses from the health.rescued record; src/core2/modules/rescue.ts rescueOnset (line 19) writes the record without the case's condition or the care it calls for; src/core2/modules/health.ts has careNeedOf (line 1286) but no care-visit action a promise could book.

**Fix.** Have rescueOnset carry the health case id on health.rescued so rescueFacts can read how serious the case is (careNeedOf, the case row) and choose the ask from it. Add one care-visit action to the health engine that a kept promise on a rescue reply books (using the engine's own care path, not a new table), and warm the tie when the player keeps it, strain it when the care need is still open a month later. Resolve both stand-ins in src/director/data/stopgaps.json. Cost: read on the rescue event and on one calendar day a month later, no daily scan.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the health engine reads the promise and the rescue scene reads the case. No dice: the visit follows the case and the promise, never a chance. The illness itself is never named in a line beyond what the case records. One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place (place and seed named), begins a serious illness through the health engine, sees the rescue scene's ask follow the case's recorded care need, promises a doctor visit, and finds a care visit in the health engine by record id and the tie's closeness changed after it; the two stand-ins are resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/rescue.ts, src/core2/modules/health.ts, src/director/rescue-facts.ts, src/director/purpose-scene.ts, src/director/data/stopgaps.json
