---
id: elections-petition-check-miscount
title: "The clerk's petition check counts one or two fewer signatures than were signed"
area: elections
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/project-thread-86yqt4
pr: "#9159"
blocked-on:
source: CTO, from the failure on PR 8080, Nov 9, 2026
claimed-at:
after:
lead: elections
standard: 2
model: opus
effort: medium
root: none
checked: fable 2026-11-10
---

**What.** The clerk's petition check counts one or two fewer signatures than were signed. `src/core2/petition-filing.test.ts` ("the clerk puts a filing on the ballot by its signatures") fails at some drawn places because a checked petition's valid count plus its struck names comes out one or two below its signature rows. Seen Nov 9, 2026: Mount Carbon, West Virginia, run seed b013e990be582152 (123 against 124), and Alma, Illinois, run seed ef2460c2d6b1632b (130 against 132). Every signature must end up counted or struck, and the fix is in the check, not the test.

**Cause.** Found in code: `src/core2/modules/voting.ts` `checkPetition` (line 641) sets `valid` to the rounded sum of each standing signer's roll count, and `electorateRoll` (line 1501) gives a counted resident `v.weight * scale`, which can be below 1, while `struckIds` counts one per row. So `valid + struckIds.length` differs from the signature rows whenever a counted resident signed; `src/core2/petition-filing.test.ts` (line 211) asserts the rows add up.

**Fix.** Count each standing signature row once in `valid` (a counted signer who signed is one signature, not a fraction or a bloc), keep `struckIds` as it is, and leave the test strict. The comment in `checkPetition` says a counted signer stands for people like them; the one-row-one-signature rule replaces that, so say so in the PR body.

**Time box.** 3 hours for one opus session.

**Rules.** No dice. One rule, all 56 places: no place is named in the check. The test stays as strict as it is. Wire to the world: the check is read by the filing's on-ballot status, so a changed count changes the ballot.

**Done when.** A second session runs `src/core2/petition-filing.test.ts` at the drawn places Mount Carbon, West Virginia (run seed b013e990be582152) and Alma, Illinois (run seed ef2460c2d6b1632b) and sees it pass, then names the signature row ids the check used to skip and sees each now counted or struck by the clerk's check in the played world.

**Waits on.** Nothing.

**Files.** src/core2/modules/voting.ts, src/core2/petition-filing.test.ts

**Notes.** Not caused by PR 8080, which removes rows only after the check. Because the test draws a random place, it fails only sometimes, and only PRs that touch this file run it.
