---
id: elections-one-reader-counted-electorate
title: "Recall petitions counted prisoners the state bars from voting, and two readers disagreed on who the electorate is"
area: elections
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-hjvzia-one-electorate
pr: #9593
after:
blocked-on:
root: design-electorate-one-model
lead: governing
model: opus
effort: medium
source: counted-carry thread, Nov 15 (traced from the M0-09 red at Pascagoula, Mississippi)
---

**What.** In a prison town of a state that bars people held in prison from voting, a recall petition counted the prison's rooms as signers and voters, and the accepted M0-09 spec test expected every counted adult of the town to be an eligible voter. At Avenal, California (0603302, seed recall-voters-1), a recall started by play over a council ordinance drew 3,600 signatures when the town's voters gave 1,992; 3,163 prison rows were on the signer list. At Pascagoula, Mississippi (2855360, seed ad071024e5a0bf8e88fa8f23138114827e03b0a45e93c0acdd09eedbe5424a50), M0-09 expected 7,441 voters and the voting engine counted 7,275. Seen: the recall's signature count on the petition and the recall vote's turnout.

**Cause.** Found in code: src/core2/modules/recalls.ts built its voters from `countedResidents`, which includes the rooms the state bars (`prisonersBarredHere`), while the voting engine's `countedVoters` leaves them out (since the barred-rooms fix, #9145); src/core2/modules/candidacy.ts kept its own inline copy of the barred-rooms rule; and src/core2/voter-groups.test.ts kept the premise from before #9145.

**Fix.** One reader of the counted electorate: the voting engine's `countedVoters`, read by voting, candidacy, public action and recalls. A recall's named signers and voters are those the voting engine's `mayVoteOn` lets vote, and its counted ones are `countedVoters`. The inline copy in candidacy is deleted. M0-09's test states its old premise and the new one. No new stopgap.

**Time box.** 3 hours, Opus at medium effort.

**Rules.** One model, two tiers: a counted group is read by every engine with the same rule as a full person, so a recall, a race and a ballot read one list of who votes.

**Done when.** M0-09 is red at Pascagoula on the old premise and green on the new; the pinned recall test at Avenal is red without the fix (prison rows among the signers) and green with it; a second session, on the train or main in a drawn prison town of a barring state with a recall rule, named with its seed, sees a recall's signatures and the recall vote count only the town's voters.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/core2/modules/recalls.ts, src/core2/voter-groups.test.ts, src/core2/recall-voters.test.ts (new), src/core2/recalls.test.ts
