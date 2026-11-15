---
id: director-relation-passed-between
title: "A scene starts from what already passed between the two people: who came before, who helped, who refused"
area: director
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by: claude/words-class-h
pr: #9444
after: director-relation-facts-one-reader
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead class H, from the Salado TX year in office (Nov 15)
claimed-at: 2026-11-15
checked: words lead 2026-11-15
---

**What.** In one year Emmanuel Suarez came to the council member's office for a job, stopped her on the street with "You're Angela, aren't you?", asked her to a party meeting, invited her to a cause and came back for a job, and each scene started from nothing; "You're Angela, aren't you?" was also said by people the packet marks acquainted. The one relation reader now says what earlier `scene.reply` records between the two left: `asked-before`, `helped-before`, `refused-before`, and the scene packet carries them as facts so a line can be placed by them. Seen: a person who already came to you does not open as a stranger.

**Cause.** Found in code: `purposeScene`'s tie block in src/director/purpose-scene.ts gave a scene `kin`, `acquainted`, `stranger` and the tie side but nothing from the reply records `replyInScene` writes, so no line could read an earlier scene; `relationFacts` in src/director/relation-facts.ts is where that read now lives.

**Fix.** `passedBetween` in relation-facts.ts reads the `scene.reply` records (indexed by kind) naming both people, the move of the one who answered and whether it is in the rules row `passedBetween.helped` or `.refused` (src/director/data/scene-talk-rules.json). The one use of "You're {first}, aren't you?" excludes `acquainted` and `asked-before`; "I read about {bill}." fills the spot.

**Time box.** 3 hours for one Sonnet session; push what passes and stop.

**Rules.** Replace, never layer. No dice. Wire to the world: the pinned test advances a day at Sheridan WY seed 7 and reads the records.

**Done when.** A second session, on main, at a drawn place from all 56 (named in the check), has a person come to the player in a scene, answers it, waits a day, and sees that person's next scene not open with the stranger's line; the Journal or Trace names the `scene-reply:` record. src/director/relation-facts.test.ts passes.

**Waits on.** director-relation-facts-one-reader (#9411).

**Files.** src/director/relation-facts.ts, src/director/purpose-scene.ts, src/director/data/scene-talk-rules.json, data/english/parts/scene-talk.json, src/director/relation-facts.test.ts

**Notes.** Opens more placements: Words lead writes the lines that require `helped-before` or `refused-before`; none are added here. Open: "Got a second?" (job-ask opener) is not yet placed by these facts.
