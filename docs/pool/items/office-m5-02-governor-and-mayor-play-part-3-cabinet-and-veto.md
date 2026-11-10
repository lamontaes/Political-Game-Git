---
id: office-m5-02-governor-and-mayor-play-part-3-cabinet-and-veto
title: "A played governor appoints a cabinet member and signs or vetoes a bill on their desk"
area: office
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after: office-m5-02-governor-and-mayor-play-part-1-gap-list
blocked-on:
lead: governing
model: sonnet
effort: medium
root: design-story-director
source: split from office-m5-02-governor-and-mayor-play in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** A played governor appoints a cabinet member and signs or vetoes a bill that reaches their desk. The appointment is read by the department's engine and the bill's signing or veto changes the law in force. The gap list in part 1 says which of these a governor can already do; build only the missing ones. Seen: a played governor's cabinet appointment and the sign-or-veto choice on a bill.

**Cause.** Design: docs/roadmap/later-specs-draft.md (M5-02, approved by the owner Oct 12). The remaining gap is not yet listed; part 1 lists it.

**Fix.** After part 1, give the played governor the missing one of: a cabinet appointment that the appointments engine records and the department reads, and a sign-or-veto choice on the desk stop that the legislature engine reads for the bill's fate.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read, not a record: the department and the legislature read the appointment and the signature. One engine per mechanic: use the appointments and executive engines, no governor-only path. The chain is the acceptance. No dice: when the player does not choose, the character decides from traits and the law.

**Done when.** A second session plays a governor in a drawn state (state and seed named), appoints a cabinet member and signs or vetoes a bill on their desk, and sees the appointee seated and the bill become law or fail, by record ids, in the running game.

**Waits on.** office-m5-02-governor-and-mayor-play-part-1-gap-list.

**Files.** src/core2/office-day-state.ts, src/core2/modules/executive.ts, src/core2/appointments.ts, src/core2/data/office-day/state-line-item-veto.json
