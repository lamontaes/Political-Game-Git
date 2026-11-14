---
id: gov-party-ask-comes-after-the-days-weighing
title: "A party's ask can only recruit for what the filing day's weighing left empty, never before it"
area: gov
lead: governing
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, political-asks advice test
claimed-at:
standard: 2
model: opus
effort: medium
root: none
---

**What.** In life a party recruits before and during the filing window, and being asked is one of the reasons a person files. As built a party's ask is written on the day the window opens, after everyone who chose to run has filed, so it reaches only members of a party that has no filer, and in a small town almost no party is in that position. Seen: Rainelle, West Virginia (5466652), world seed 2f25fb7e430b668e070d0566797f919b69f4d98980ad291944d6a73c00966ea8, one day after the 2025-12-02 window: Republican and Democratic already had filers for the 2026 partisan seats, Libertarian and Mountain had no chair.

**Cause.** Found in code: `askForCandidates` runs at the end of the filing day's weighing (src/core2/modules/candidacy.ts, after the candidates of the contest are filed) and `partyProspects` skips any party with a filing under its label. An ask is a cause of a filing as built (`decideToRun` takes `askedBy` with the ask's record id as a reason), but only for a member who did not decide to run in the day's weighing, and only for a party with no filer. Rainelle's 2028 seats listing 0 Republican and 0 Democratic members is the window, not membership: the party has 45 and 20 members in town (38 and 16 of age), and every one fails the single rule `filing-deadline` until the window opens.

**Fix.** Design: a party recruits ahead of and through the window, so a member is asked before the weighing and the ask is among that member's reasons. This needs the Words lead's and the owner's view of when a party asks (before the window, on opening day, or as the deadline nears) and is not built here.

**Time box.** 2 hours for one opus session after the ruling.

**Rules.** No dice: the ask follows from the party's chair, its members' standing and who has filed, never a chance. Wire to the world: any change reads the records the weighing already keeps.

**Done when.** In the played world at a drawn place a party's ask is written before a member of that party files, the filing cites the ask among its reasons, and a second session sees the ask and the filing in the running game.

**Waits on.** A ruling on when a party asks.

**Files.** src/core2/modules/candidacy.ts

**Notes.** Asked by the Account lead on Nov 14. Needs a ruling on when a party asks before it is built. Filed by hand.
