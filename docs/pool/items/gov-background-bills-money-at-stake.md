---
id: gov-background-bills-money-at-stake
title: "Background bodies propose bills with money at stake, so a bribe has a cause"
area: gov
kind: feature
priority: 2
size: M
status: claimed
claimed-by: claude/background-stakes
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-16T16:37:35.212Z
---

**What.** Bribes are offered only when a bill has money at stake for someone. Bills proposed by the background bodies (other governments) carry no stakes the interest groups can read, so bribes there have no cause. Give each such bill the money it moves, from the bill's own provisions.

**Rules.** No dice; an effect is a read; one rule, all 56 places; the chain is the acceptance.

**Done when.** In a one-year run of a drawn place, an offered bribe cites a background body's bill and the money it moves, by bill and offer record ids.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/corruption.ts

**Notes.** Split out of gov-needs-opus-gov-209 (line 209 of OPUS-GOV.md), which built the voting and polling-place reads. Not checked against main beyond a search.

Looked at Oct 16 (claude, released, not built; three drawn places played 400 days each: Fremont, Michigan seed b15f185006, Macdoel, California seed d5372a3232, Luana, Iowa seed f3696d4eaa; four more with the same count of bills and meetings in Estill Springs, Tennessee, Nathrop, Colorado, Rowena, Oregon and Riggins, Idaho). The premise that background bills carry no stakes does not hold for the bodies that cover the town. `lobbied` in `src/core2/modules/interest-groups.ts` already meets the members of a state or federal chamber whose seat covers the town, and `employerStakes` reads the bill's own policy-question provisions: in those places state-chamber bills got lobbying meetings, 18 of 144 with a positive annual cost to the town's employers (Luana: 8 upper-chamber and 4 lower-chamber meetings with a cost; Fremont: 6 lower-chamber). What is true is that no bribe was offered in any of the seven places, including on bills with a cost, and that is the offer decision, not the stake: `considerBribe` (corruption.ts) records a crime only when the offerer's own reasons say yes, so a world with no one inclined to offer has none, which is what the no-dice rule asks for. A body that does not cover the town (another county's board, another state's chamber) has no employers in the town to bind, so no meeting is held for it by design. To make the done-when ("an offered bribe cites a background body's bill and the money it moves") observable, find a seed where an offerer's reasons say yes (the temperament and tie terms in `decide`) and play it; do not add stakes the bills already have. Close or narrow the item to "show one offered bribe on a state-chamber bill in a drawn place".
