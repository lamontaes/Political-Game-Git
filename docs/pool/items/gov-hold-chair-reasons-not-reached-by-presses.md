---
id: gov-hold-chair-reasons-not-reached-by-presses
title: "Four reasons a chair gives for holding a bill, and two strangers' setups, are not yet seen in a played talk"
area: gov
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead, Nov 16: the Words lead's read of #9630 asked that each added line be shown said by the player's presses, or stay as an unreached row named on an item"
claimed-at:
after:
lead: words
model: sonnet
effort: medium
root: rc3-thin-life-record
---

**What.** In the sponsor's ask of a committee chair (`hold-chair-sought`) the chair says the reason the committee record holds. Played by presses in #9630: the chair's own view, party, district and last vote. Not reached: next election ("I have a race coming. I can't have this in my committee before it."), sponsor ("I'll be plain. I don't trust you with this, so it gets no hearing."), group ("People came to see me about it. They're against it, and I heard them.") and temper ("I'm slow to move on a bill like this. It stays where it is."), and the two setups for a chair the sponsor has not met ("{full-name} chairs the committee holding {bill}. You knock on the office door.", "{bill} has no hearing date. {full-name}, the committee's chair, is in when you come by."). These lines are in the bank, read by the Words lead, and unplayed. Seen: Texas (4846968, seed 8647-mason), where the played asks reach the reasons above and none of these six.

**Cause.** Measured: a script outside the test drafted one bill on every question for two seats at each of eight places (4846968, 5522550, 5669845, 4864268, 1817074, 0973980, 5048850, 4921880, seed 8647-mason) and listed each chair's strongest reason; sponsor, group and next-election never came first, and temper came first only in worlds (5669845, 5048850) where the single-bill replay wrote no hold. No stranger chair appeared in the played worlds.

**Fix.** Find, by the same script on more places and seeds, a world where each is the recorded reason (or a chair and sponsor who have not met) and add one played case to `src/director/hold-chair-sought.test.ts`; delete any line no world reaches after the search, with the Words lead's say.

**Time box.** 2 hours for one Sonnet session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** No dice; the reason is the committee record's strongest term against the bill, never chosen.

**Done when.** Each of the six lines is said in a played test at a named place and seed by the player's presses, or is deleted with the Words lead's ruling; a second session on main sees one of them in a place it names.

**Waits on.** Nothing.

**Files.** src/director/hold-chair-sought.test.ts; data/english/parts/scene-talk.json
