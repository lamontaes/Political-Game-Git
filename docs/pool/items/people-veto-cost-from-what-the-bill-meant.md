---
id: people-veto-cost-from-what-the-bill-meant
title: "What a veto costs the sponsor's tie comes from what the bill meant to them, not the whip answer's step"
area: people
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after: government-executive-shared-time-with-body
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Account lead, Nov 15, ruling on #9489 (desk item 5)
---

**What.** A veto cools the executive's tie with the bill's sponsor by the whip answer's step (`whipAnswerCloseness`, 0.05 hours of quarrel), the same for a sponsor who carried the bill through a year of hearings and one who put their name on it last week. On a tie of about 40 hours that is about 0.0002 closeness (Havre MT, seed 4276344481a2b078e70633cfee47d0caccb65f74:2: 0.507219 to 0.507002), too small for anything the player meets to change. Seen: in the played veto file (`/mnt/project-files/words-lead/desk/veto-talk-played-dbeeb61b.md`) the sponsor of a bill they worked on for months and the sponsor of a one-day bill are cooled alike.

**Cause.** Found in code: `decideDesk` (src/core2/modules/office-day.ts) writes `-vetoCloseness()`, which returns `federalParameter("whipAnswerCloseness")`, a TUNABLE number borrowed from the whip answer. No record of what the bill was to the sponsor is read.

**Fix.** Read the size of the quarrel from records the game already keeps of what the bill meant to the sponsor: their own stand on its question (the views engine, `viewOn`), the sittings, hearings and meetings they gave it (the legislature's and office-day's records for that bill), and the trades they made for it (`bill.deals` owed by the sponsor). Write it through the tie writer as today, as hours, so the apology and the second quarrel (veto-talk.ts `answerVeto`) keep reading the same step. Remove the veto's use of `whipAnswerCloseness` and its note in federal-parameters.json. No new tuned number: where a weight is needed, it is the hours those records already stand for.

**Time box.** 3 hours, one Opus session at medium effort.

**Rules.** No dice; one rule, all 56 places (the same read for a mayor's and a governor's veto); wire to the world: the cost is read by the sponsor's support for the player's next bill (`memberPosition`'s sponsor term), the friend line (relation-facts), and the sponsor's next talk.

**Done when.** At two named places and one drawn place, a sponsor who gave a bill its hearings and trades loses visibly more closeness to a veto than one who did not, by record ids; in a played file, a sponsor's support for the player's next bill moves by the veto; a second session sees the difference in dev mode on main.

**Waits on.** government-executive-shared-time-with-body (an executive and a sponsor who share no tie have nothing to cool).

**Files.** src/core2/modules/office-day.ts, src/director/veto-talk.ts, src/core2/data/office-day/federal-parameters.json

**Notes.**

- Nov 15, desk thread (Words lead's ruling on #9489): the veto lines "I'm still sore about {bill}." and "I'm not holding it against you." were deleted from #9489 because no record says whether the sponsor still holds the veto or has let it go; the step above is too small to tell. They are kept in /mnt/project-files/words-lead/desk/known-by-act-introductions.md and come back gated on this item's record: the cost the veto wrote to the tie and whether the tie has since recovered from it (still held: the sore line and no forgiving closer; let go: the closer and no sore line, each by requiresFacts and excludesFacts on one fact, never one line barred after another by key). Done when, added: a played file at two places shows one sponsor still sore and one who has let it go, and no talk says both.
