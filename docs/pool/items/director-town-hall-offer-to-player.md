---
id: director-town-hall-offer-to-player
title: "A resident or staffer asks the officeholder to hold a town hall on a question, from the same cause the engine uses for everyone else"
area: governing
kind: feature
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
lead: governing
milestone: play-first
source: "director helper trace, Nov 10: town-hall-question fires far less than other scenes; the director offers the player no town hall"
---

**What.** Nothing in the director offers a held town hall as a choice. Traced (all read-only):

- The engine holds them for everyone but the player. `considerTownHalls` (src/core2/modules/meetings.ts) runs weekly for each local official and town candidate and skips `playerId` ("the player aside, who holds one by choice"). An official's reason is a bill before their body that splits the town evenly (`raise(..., "bill", bill.id)`) or their own race coming up (`"race"`); temperament and the evening's effort weigh against it, and the record keeps the reason in `calledFor`.
- The player can hold one only by finding the office-day act `town-hall` (src/core2/office-day-acts.ts, gated by `townHallDue`, one every `townHallIntervalDays`) or, as a candidate, the campaign forum (done, campaign-forum-the-player-hosts).
- The director has no situation type, circumstance row or bank piece in which anyone asks the player to hold one (searched src/director/data and data/english/parts for "hold a town hall"; the only town hall type is `town-hall-question`, the host's scene after a hall is held, whose cause needs `hostId` to be the subject).
- So the host's scene reaches the player only after they chose the act, and the halls the town's other officials hold give the player only a journal line as an attendee.

**Proposal for the governing lead (not built).** Add a staff or constituent ask on the player's own cause, read from the same records `considerTownHalls` reads: a bill before the player's body that splits the town evenly (the evenness the engine computes), or the player's race within `townHallCampaignDays`. The ask is a director scene whose reply "hold one" calls the existing act (no new engine), and whose cause the later `town-hall-question` scene cites. The director side is one circumstance row and one type; the part that is not the director's is an exported read of the engine's reasons (`why.kind`, `why.recordId`), which needs the governing lead's word on src/core2/modules/meetings.ts.

**Done when.** In a played year in a drawn place, with the player seated on a body that has a bill splitting the town, a staffer or constituent asks the player to hold a town hall citing the bill; holding one writes the engine's `town-hall` record with `calledFor` naming that bill; and the host's `town-hall-question` scene follows from it.

**Files.** src/director/data/circumstances.json, src/director/data/situation-types.json, data/english/parts/scene-talk.json, src/core2/modules/meetings.ts (export the reasons read)

**Time box.** 3 hours.

**You will see.** "People are split on the transit ordinance. Will you hold a town hall before it comes up?"
