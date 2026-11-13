---
id: campaign-door-pledge-held-loses-to-summed-appeal
title: "A door yes held in full can still lose the vote: the pledge's 2 points are smaller than the other reasons added together"
area: elections
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: sonnet
effort: medium
root: none
source: Gate desk 2, Nov 11, 2026 (10:50 UTC on the crew's issue and on #8580), cause written in by the cause finder for Fable B
---

**What.** src/core2/door-pledge.test.ts, "a door yes is near-binding", fails by draw on clean main (3dc5bfe1d9): Gate desk 2 saw 2 of 3 runs red. The failure it read: ballot:contest:seat:US-ID:governor:2026-11-03:person_8c34db6fdff0809e "broke a held pledge". The voter's yes at the door to the test's candidate held in full on election day (the ballot's pledge part equals the whole pledge weight), yet the ballot's choice is official:nominee:Republican:contest:seat:US-ID:governor:2026-11-03. The owner ruled on Oct 29 that a yes at the door is near-binding, so the game is wrong here, not the test. Seen: a resident who told the player "yes" at the door votes for the other party's nominee with nothing learned since to undo it, which the race's results in dev mode show by ballot.

**Cause.** Found in code: in src/core2/modules/voting.ts the vote is `countedChoice(appeal)` (line 2053), the candidate with the greatest total. A held pledge only adds `parts.pledge`, `doorPledgeWeight` times how far it holds, to that candidate's total (lines 1014 to 1025). `doorPledgeWeight` is 2 (src/core2/data/campaigns/parameters.json line 123). Its own note says it is larger than each other reason a voter weighs, "each about -1 to 1". But the total adds about ten of them together: party, standing, incumbent, recognition, warmth, party tie (`partyLoyaltyWeight` 0.5), relationship, record, ballot place and scandal. A nominee of the voter's own party in a one-sided state can lead the pledged candidate by more than 2 on those alone. Then the pledge, held in full, does not decide. `pledgeDoubt` (line 791), the only thing meant to undo a pledge, never sees party. The counted tier has the same sum (src/core2/electorate.ts line 556, `pledge = pledgeWeight * (where.pledges?.[entry.id] ?? 0)`), so a pledged counted household can break its word the same way. The test reads the owner's rule correctly (lines 321 to 327: held in full, it decides the vote).

**Fix.** Make a held pledge decide in proportion to how far it holds, on a sliding scale with no threshold, in both tiers with one rule:

- In a new helper in src/core2/electorate.ts, used by `appealFor` in voting.ts and by the counted appeal in electorate.ts line 556, set the pledged candidate's pledge part to `holds * (doorPledgeWeight + Math.max(0, best rival's total without pledge - own total without pledge))`, where `holds` is 1 minus `pledgeDoubt`.
- Held in full, the pledged candidate then leads by the pledge weight whatever the other reasons sum to. Half held, the pledge closes half the gap and adds half the weight. Fully doubted, it adds nothing.
- Update the note on `doorPledgeWeight` to say it is the margin a held yes keeps, not a size compared with the other reasons.
- `heldPledge` (voting.ts line 2505) reads the part over the weight; keep it reading `holds` directly, so turnout is unchanged.
- The test stays as it is.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: the pledge's hold comes from `pledgeDoubt`'s recorded reasons, never a roll. Sliding scales and causes: nothing flips at a threshold. One model, two tiers: a counted household's pledge uses the same rule as a full person's, times its count. Never weaken a test to get green: door-pledge.test.ts keeps its "held in full, it decides the vote" check.

**Done when.** A second session runs `GOLDEN_PATH_PLACE_KEY=1663550 npx vitest run src/core2/door-pledge.test.ts` on three seeds and `npx vitest run src/core2/door-pledge.test.ts` on five fresh draws, each run naming its drawn place and seed, and sees every run pass. In one played race in the drawn place, a ballot whose pledge held in full shows the pledged candidate as its choice even where another candidate's other reasons sum higher, named by ballot id with both totals.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/electorate.ts, src/core2/data/campaigns/parameters.json, src/core2/door-pledge.test.ts

**Notes.** Not run here: the cause is from the code and Gate desk 2's failing ballot, read-only on the game, inside a 45-minute box. A builder should first print the failing ballot's `appeal` (the test's message holds it as JSON) to confirm that the nominee's total minus the candidate's, without the pledge, exceeds 2. Related, separate: campaign-door-pledge-held-read-at-ballot (#8525) fixes a drift in `pledgeDoubt` after election day, which is a different cause of this test going red.
