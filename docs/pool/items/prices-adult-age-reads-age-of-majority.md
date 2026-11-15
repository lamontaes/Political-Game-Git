---
id: prices-adult-age-reads-age-of-majority
title: Other readers use the voting age to mean "adult"; check each against the age of majority
area: world
kind: cleanup
priority: 3
status: in-pr
standard: 2
claimed-by:
pr: #9350
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
milestone:
source: "Account lead, Nov 14: #9315 counted adults for prices from votingAge"
claimed-at:
size: S
---

**What.** A law that lowers the voting age would also change who counts as an adult where the game means "of age": a household's bills, who decides alone where to live, who a parent still answers for. The price engine now reads the place's age of majority (the one reader `ageOfMajority` in `src/core2/age-of-majority.ts`, shared with `moves.ts`). Other readers still use the `votingAge` parameter to mean adult. Seen: in dev mode, a household's price-law bills and a move out of a parent's home in a place whose age of majority is not 18.

**Cause.** Found in code: `api.parameter("votingAge")` or `P.votingAge` is used as the adult line, not only for voting, in `src/core2/modules/people.ts` (432, 519), `drives.ts` (1674), `moves.ts` (1174), `counted-moves.ts` (582, 1266, 1340, 1937), `rescue.ts` (25), `residents.ts` (423, 2455, 2538), `press.ts` (596, 1095, 1230, 1353, 1657), `kin-contact.ts` (34) and the director's `family-stake.ts`, `coming-of-age.ts`, `rescue-facts.ts`, `conversation.ts`, `journal.ts`. `voting.ts` (1638, 1665) uses it for voting, which is correct.

**Fix.** Read each of those uses and sort it: voting (keep `votingAge`), or adulthood (read `ageOfMajority(placeId)` from `src/core2/age-of-majority.ts`). Change only the adulthood ones, one family at a time, each with a pinned test at a named place whose age of majority is not 18 (Mississippi 2854920 is 21, Alabama is 19). The player sees it where a household's bill, a move out of a parent's home or a coming-of-age scene follows the place's age of majority.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice. One reader, never a second copy. Replace, never layer: the `votingAge` read is deleted where it is changed.

**Done when.** A second session, on main in a named place whose age of majority is not 18, sees in dev mode that a 19-year-old counts as a child for the changed readers and that a law lowering the voting age leaves them alone.

**Waits on.** Nothing.

**Files.** src/core2/modules/people.ts, src/core2/modules/drives.ts, src/core2/modules/counted-moves.ts, src/core2/modules/rescue.ts, src/core2/modules/residents.ts, src/core2/modules/press.ts, src/core2/modules/kin-contact.ts, src/director/conversation.ts

**Notes.** The price engine's own read is done in the PR that adds this item.
