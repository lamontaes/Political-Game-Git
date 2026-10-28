---
id: laws-hold-record-names-the-sponsor
title: "A bill held in committee names its sponsor and reaches the press, and a scene reply can put it back on the calendar"
area: laws
kind: wiring
priority: 2
size: S
status: claimed
claimed-by: claude/held-bill-names-sponsor
pr:
blocked-on:
lead: laws-effects
source: added with npm run pool -- add
claimed-at: 2026-10-28T02:57:53.360Z
---

**What.** The committee record bill-held-in-committee (src/core2/modules/legislature.ts, committeeStage) lists the committee's members and chair but not the bill's sponsor, so the sponsor never meets the hold as a moment and no scene can be theirs. It also carries news false, so the paper never says a bill died without a hearing, and nothing reads the scene.reply that the sponsor-asks-chair scene writes, so a chair who says yes in the scene does not set a hearing. Add the sponsor to the record's personIds with a sponsorId fact, set news so the press engine can run a held-bill line, and have the chair's hold decision read a scene.reply of type bill-held-chair that agreed.

**Rules.** No dice: the chair's decision stays chairHearsBill (position plus traits); a reply is one more recorded reason, read at the decision, never a roll. Wire to the world: the press line and the re-listing are proven in a generated world. One rule, all 56 places.

**Done when.** src/core2/modules/legislature.test.ts or src/director/hold-scenes.test.ts in the played world (buildBenchWorld) on a place drawn from all 56 with a seed nobody chose shows a bill-held-in-committee record whose personIds include the sponsor and whose sponsor meets it as a moment; a press story names the held bill by record id; and a chair's agreed scene.reply moves the bill to a committee-hearing record.

**Files.** src/core2/modules/legislature.ts,src/core2/modules/press.ts,src/director/hold-scenes.test.ts

**Notes.** lead: laws-effects. Time box 3 h, Sonnet. Found by scene builder C in docs/design/scenes/from-life/bill-held-in-committee.md. Producers already on PR scenes-c-bill-held.
