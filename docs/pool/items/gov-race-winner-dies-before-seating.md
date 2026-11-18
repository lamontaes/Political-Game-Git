---
id: gov-race-winner-dies-before-seating
title: "A holder who wins re-election and dies before the new term starts is replaced by a newly drawn person of their party, seated as elected, instead of the seat falling vacant"
area: gov
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
standard: 2
model: opus
effort: medium
lead: governing
root: design-one-model-two-tiers
source: Fixer A, Nov 18, offices-every-legislature on #10133 at Owyhee, Nevada (place 3253600, seed 8f37caf17878abe0)
claimed-at:
after:
checked:
---

**What.** A holder can win the November race and die before the new term starts. When that happens, the voting engine seats a person nobody voted for. At Owyhee, Nevada (3253600), seed 8f37caf17878abe0, on #10133's head e4a0688a:

- Kyle Spears (Republican) held `seat:US-VA:lower:100:0` from the opening.
- The Republicans won `race:seat:US-VA:lower:100:0:2025` on 2025-11-04.
- Kyle died on 2025-11-11 by the health engine's rule (`term:seat:US-VA:lower:100:0:2025-01-20`, ended by `death`).
- On 2026-01-14 the engine seated Jared White (Republican), a name drawn that day, as `term:seat:US-VA:lower:100:0:2026-01-14:elected`, "elected 2025-11-04".

Seen: the state screen's member list, and the seat's terms in dev mode.

**Cause.** `seatRaceWinner` in `src/core2/modules/voting.ts` runs on the seating day. It reads `serving` (the seat's serving terms) to decide whether the winner is the holder re-elected. An outside race records only `winnerParty`, never a person. Once the holder has died, `serving` is empty, so `reelected` is false. With no named candidate either, the identity is drawn fresh by `drawOfficialIdentity` (role `state-executive-challenger`), and the term is written as `elected <race date>`. The race was won by the holder who died, not by the drawn person.

**Fix.** At seating, `seatRaceWinner` recognizes a race won by a holder who has since died. The seat's last term before the seating day has `endedBy` `death`, its holder's party is `winnerParty`, and it ended after the race's date. In that case the new term starts vacant, and the place's own vacancy law fills it (appointment or special election). That is the same route `vacateSeat` in `src/core2/modules/offices.ts` takes for a death in office: one vacancy engine, no second writer. The vacancy law and its filler come from the place's records, never from a draw. A holder who died before the race is already handled by the vacancy at death and needs no change. Once this lands, remove the `endedBy !== "death"` skip in `src/core2/offices-every-legislature.test.ts`'s re-elected check, and make the test expect a vacancy-law filler for such a seat.

**Time box.** 3 hours.

**Rules.** One engine per mechanic: the voting engine seats winners, and the offices vacancy engine fills vacancies. No dice. One rule, all 56 places. Two-level population: nobody is built for it.

**Done when.** A second session, in a played world at a drawn place and seed nobody chose, plays past a January seating and sees a seat whose re-elected holder died after the November race open vacant on the term's start, with the filler named by the place's law and listed by record id. offices-every-legislature.test.ts passes with the skip removed.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/offices.ts, src/core2/offices-every-legislature.test.ts

**Notes.** CTO, Nov 18 16:48Z on #9747 (6985235014): "File option 2 as its own pool item. When a race's winner dies before taking the seat, the new term starts vacant and the place's own vacancy law fills it, the same way a death in office does. That's the real-world behavior." Until then #10133's test counts such a seat as changed, by that same line.
