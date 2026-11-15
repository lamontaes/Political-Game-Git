---
id: elections-petition-signer-age-law-change-untested
title: 'A signer who is under the voting age at the check cannot occur, so the clerk''s "too young" word is never played'
area: elections
kind: wiring
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: sonnet
effort: medium
root: none
source: "builder of #9441, Nov 15, 2026, answering the Account lead's ask to stage each struck kind"
checked:
---

**What.** The clerk's check names why a signer came off by kind: moved, died, under-age, barred. Moved, died and barred are staged and played in `src/director/petition-checked-scene.test.ts`. Under-age cannot be staged through the game's own path: a signer is an adult when they sign, ages only go up, and the voting age is a law that no engine changes during a petition's circulation. So `struckReasonsOf` in `src/core2/modules/voting.ts` can write `under-age`, and no played world ever does. Seen: the clerk's scene after a petition whose signer was struck for being too young.

**Cause.** Found in code: `src/core2/modules/voting.ts` `struckReasonsOf` returns `under-age` when `ageOn(person, date) < votingAge`; signers come from the electorate roll (`electorateRoll`), which already requires voting age on the signing day, and nothing raises the voting age between signing and the check.

**Fix.** When a law that raises the voting age (or a place that changes it by its own rule) is built, add a test that signs, passes the law and checks the same petition, then play the clerk's scene on that record. Until then the scene bank carries no under-age line (they were removed rather than shipped unplayable). Nothing is built now; this item holds the gap so the kind is not forgotten.

**Time box.** 1 hour for one sonnet session once a voting-age law exists.

**Rules.** No dice; one rule for full people and counted residents.

**Done when.** A second session, in a place and seed it draws, passes a voting-age change between a petition's signing and its check, and sees the clerk's scene name "too young" by record id.

**Waits on.** A law that changes the voting age during play.

**Files.** src/core2/modules/voting.ts, src/director/petition-checked-scene.test.ts

**Notes.** Found while building scene-clerk-petition-word (#9441).
