---
id: words-past-win-seat-from-record
title: "A past win on a card says the seat from the election's own office record"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "Words builder W2, Nov 13, the gap named in #8981 and Fable A's ruling on #8928"
---

**What.** On a person card, a win whose term has ended reads "won election as council member" with no "a", while the term served now reads "a council member" (#8981). The card cannot tell the seat count of an office it reaches only through an election result. Seen: any card of someone who held a council seat before and does not now.

**Cause.** Found in code: the election-result record (`src/core2/modules/voting.ts`, `kind: "election-result"`) carries `contestId` and `office: contest.title`, but not `contest.officeId`, though the contest has it. The life mapping (`src/core2/data/life/remembered.json`, record `election-result`, what `won`) keeps `office` and `contestId` only. So `politics/won` in `src/bench/card.ts` finds the office record only through a term the person serves now.

**Fix.** Add `officeId: contest.officeId` to the election-result record's facts, add `"officeId"` to the `won` row's facts in `remembered.json`, and in `card.ts`'s `politics/won` read `officeSlotsOf(core, facts.officeId)` before the serving term. No new wording.

**Time box.** 1 hour for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The seat comes from the office record's seat count, never a list of titles (Fable A, Nov 13). An effect is a read: the fact is added because the card reads it.

**Done when.** A second session starts a new life in a drawn place (place and seed named), presses Week until a council race is counted, opens the card of a council member who lost their seat or of the winner after a later loss, and the story reads "won election as a council member". A one-seat office's past win reads with no "a".

**Waits on.** #8981.

**Files.** src/core2/modules/voting.ts, src/core2/data/life/remembered.json, src/bench/card.ts

**Notes.** Filed Nov 13 by Words builder W2.
