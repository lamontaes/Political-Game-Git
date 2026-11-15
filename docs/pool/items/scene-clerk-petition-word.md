---
id: scene-clerk-petition-word
title: "The clerk tells the player how their petition came out, and a short petition leaves them to back someone else"
area: director
kind: feature
priority: 1
size: M
status: in-pr
claimed-by: claude/petition-clerk-scene
pr: "#9441"
blocked-on:
source: owner, Nov 15, 2026 (build-out of scenes: "different ways to start scenes", "imagine situations in the county clerk's office"); brief section 10.1 of /mnt/project-files/scene-buildout/rulings-and-briefs.md
claimed-at: 2026-11-15T05:30:00Z
after:
lead: director
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** The clerk's check of a petition (the morning after its deadline) wrote a public record that no scene read, and kept who was struck but not why. Now the clerk's office tells the player: the papers are in, or they fell short, and where names came off the clerk says why by kind (moved away, died, barred; a signer too young to sign cannot occur in play, see elections-petition-signer-age-law-change-untested), never how many. A player whose petition fell short can say they will back someone else in the race, and that is their own endorsement. Seen: the clerk's scene the morning after the petition is due, at the counter or by phone, and the paper's endorsement story after a player says they will back someone.

**Cause.** Found in code: `src/core2/modules/voting.ts` `checkPetition` struck signers off the roll and kept only `struckIds`; `src/core2/modules/elections.ts` `keepPetitionCheck` emitted the public event `petition-checked` that `src/director/data/director.json` makes a cause moment and no situation type in `src/director/data/situation-types.json` matched; no act let the player back a candidate (`keepEndorsement` in `src/core2/modules/campaigns.ts` was reached only through `askForEndorsement` by people asked).

**Fix.** `checkPetition` keeps `struckReasons` beside `struckIds` (`struckReasonsOf`, read from the signer's own record the day of the check; a counted resident is struck only for moving, age or being barred, one rule for both tiers). One situation type `petition-checked` and purpose of the same name on `cause:event:petition-checked` (the event now says `circulated` only where a petition circulated, so a filing the law asks nothing of has no scene), the clerk cast from the filing the record names (`civic-roles.ts`), facts handed to the words in `purpose-scene.ts` (`short` or `on-ballot`, one `struck-<reason>` fact per reason with the signers' record ids, `backable`). `endorsementChoices` (campaigns.ts) reads up to two candidates in the race the player would back by the same weighing as anyone's endorsement, and the player picks one by their reply; only that reply calls `askForEndorsement` with `unasked`, writing the player's own endorsement row and public event (nothing is written for the player without their press). The Words lead's lines (`clerk-petition/lines.md`) are in `data/english/parts/scene-talk.json`.

**Time box.** 4 hours for one sonnet session.

**Rules.** No dice; no count in any line; one scene engine; replace, never layer; a person asked can say no (the player is offered only a candidate they would back); keep results, not their history (signature rows still go in play).

**Done when.** A second session, at a place and seed it draws, files for a race that needs a petition, lets one signer move away before the deadline, and sees the clerk's scene the morning after name the move without a number; then files again, gathers nothing, sees the short word, says they will back someone, and finds that person's endorsement under the player's name.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/modules/elections.ts, src/core2/modules/campaigns.ts, src/director/purpose-scene.ts, src/director/civic-roles.ts, src/director/data/situation-types.json, src/director/data/purpose-arcs.json, src/bench/data/scene-places.json, data/english/parts/scene-talk.json, src/director/petition-checked-scene.test.ts

**Notes.** The Words lead wrote the lines; M5 judges the pair sheets; the Words lead or second reader stamps the played file for the exact head. Pinned test: src/director/petition-checked-scene.test.ts (Acequia, Idaho, seed 1110d079). Petition objections (step 14) are a struck signer with another reason on the same field.
