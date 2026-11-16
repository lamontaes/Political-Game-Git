---
id: gov-player-asks-chair-for-hearing
title: "The player asks the committee chair to hear a bill the chair held"
area: gov
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on: gov-favor-owed-only-when-it-carried
source: "the Account lead, Nov 15: a held player bill got no scene and nothing to press; the chair's reasons sat on the committee record read by nothing"
claimed-at:
after:
lead: laws
model: sonnet
effort: medium
root: rc3-thin-life-record
---

**What.** When a committee chair holds a player's bill without a hearing, the player has nothing to press: the sponsor's ask of the chair exists only for a non-player sponsor, and the chair's reasons are kept on the committee record and read by nothing. A player whose bill is held cannot ask the chair, plead, or learn why. The held bill's chair, when the player is the chair, meets the sponsor's ask as a journal line and not as a scene that stops the day. Seen: Texas (place 4846968, world seed 8647-mason), where the player in seat 007 drafts the body's eighth question and the chair of its committee holds it on Feb 9.

**Cause.** Found in code: `src/director/data/situation-types.json` has `bill-held-chair` (the sponsor asks the chair, played by a non-player sponsor) and no type where the player asks; the hold record names its people by sort order, so a scene cast "the first person the cause names" gets a committee member and not the chair; and `ownRecordScenes` omits `cause:event:bill-held-in-committee`, so the hold stages as a journal line (`src/director/scheduling.ts`). `SG-LAW-held-bill-chair-reasons-unread` names the unread reasons.

**Fix.** A situation type `hold-chair-sought` (the player asks the chair), staged as a scene for the sponsor and for the chair (`ownRecordScenes`); the hold's people name the chair first; `hearing-ask` gets an `asks` block so the chair answers from the committee's own record (their position, temper and the cosponsors' pull, term by term) and what a favor to the player is worth to them: yes where their own stand reaches a hearing, a stall where a favor would carry them, the no with the strongest term against the bill as the reason otherwise. A plea that carries the hearing reopens it and writes the favor owed (the same row `keepReply` writes for a plea-carried vote, #9609). `SG-LAW-held-bill-chair-reasons-unread` is deleted. The lines the scene needs are the Words lead's (narrator setups for the player's walk to the chair, and a no for each reason).

**Time box.** 6 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice: the chair's recorded stand, temper and the favor decide. The engine never answers for the player. Dev mode's Trace on the committee record shows the chair's lean by term.

**Done when.** In a played world test at Texas (4846968, seed 8647-mason, buildBenchWorld), by the player's presses: seat 007 on question 7 meets the chair's stall, pleads, the committee hears the bill (`hearing:<bill>` agreed, the committee record heard) and the favor row is owed to the chair; seat 016 on question 3 gets the plain no whose reason fact is the committee record's strongest term; the chair of a held bill (lower seat 059) meets the sponsor's ask as a scene that stops the day. A second session on main, in a place and seed it names, sees a held bill's sponsor ask the chair.

**Waits on.** The Words lead's lines for the walk and the reasons; #9609. The player sees it as the scene after a hold, the reopened hearing on the calendar, and the hold staying with the reason heard.

**Files.** src/director/data/situation-types.json; src/director/data/purpose-arcs.json; src/director/purpose-scene.ts; src/core2/modules/legislature.ts; src/core2/data/stopgaps/law.json; src/director/hold-chair-sought.test.ts (new)
