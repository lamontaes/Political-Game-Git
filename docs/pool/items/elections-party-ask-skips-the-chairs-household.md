---
id: elections-party-ask-skips-the-chairs-household
title: "A party chair's ask to run goes to a member outside the chair's own home"
area: elections
kind: bug
priority: 3
size: S
status: in-pr
claimed-by: long-game
pr: 9903
after:
blocked-on:
source: party-recruit on drawn places, Camp Pendleton South, California (0610561), seed be5b37fd914048f070834876da83eb94161a7a08307cd686995d0b77e2933513, replay GOLDEN_PATH_SEED=ecc6029de7cc7f04
lead: governing
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** A party chair with no one filed for a seat asks a member to run, and the director stages a visit at that member's home. The member who is closest to the chair is asked first, and that is often someone who lives with the chair. The director's receive rule sends a visit from a housemate to the journal, so the ask stages no scene and the player never sees it. Ask a member who lives apart from the chair. Seen: the party-recruit scene plays for the ask, at a statewide seat as at a town seat.

**Cause.** Found in code: `partyProspects` in `src/core2/modules/candidacy.ts` ranks members by closeness to the chair and does not exclude the chair's own household, and `receives` in `src/director/scheduling.ts` refuses a cast whose asker lives with the person ("counterpart": "apart"). At Camp Pendleton South the asked member (person_051115c27c945373) and the chair (person_051114c27c9451c0) share a home, and the moment `party-asked:contest:seat:US-CA:attorney-general:2026-11-03:party:US-CA:democratic:person_051115c27c945373` scheduled as a journal line with no cast.

**Fix.** In `partyProspects`, leave out members whose household is the chair's. No new path; the next member by the same order is asked.

**Time box.** 1 hour for a Sonnet session. When it runs out, push what passes and stop.

**Rules.** No dice: the order is the one the engine already uses. One rule, all 56 places: nothing names a party or place.

**Done when.** `src/director/party-recruit.test.ts` draws places, and at Camp Pendleton South with GOLDEN_PATH_SEED=ecc6029de7cc7f04 it passes: every ask for a watched member stages a `party-recruit` scene.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts

**Notes.** Nov 17 (Long game): fixed in `partyProspects`; the drawn test passes at the failing seed in 450 s.
