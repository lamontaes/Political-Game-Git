---
id: scandal-call-says-what-the-paper-found
title: "A reporter calling about an exposure says what the paper found: who paid and for what vote, or which contract went to whose firm"
area: words
kind: bug
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: Account lead builder (thread "Fix the reporter's call scene")
pr: 9482
after: press-exposure-asks-for-comment-before-it-prints
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Owner, Nov 15 01:02Z (the scandal call, "I've got a story about the water rates, and your name is in it... that's very ambiguous"); Words lead's lines, reply-sets/oath-bribe-scandal.md part C
claimed-at: 2026-11-15
---

**What.** The owner read a scandal call that said only "I've got a story about {story}, and your name is in it." In the game it was worse: the call never played. A paper's exposure (press.exposed) names its outlet by the press's outlet row, and the scene looked that id up as an organization, so the narration ("Your phone rings. It's {name} from {outlet}.") had no outlet and every scandal call was skipped. Where it was composed by hand, the reporter never said what the story is ("We're running a story about you tomorrow."), and the replies spoke of minutes and signatures that no exposure is about. Seen: the call plays, the reporter says who paid and the vote it bought, or the contract and whose firm, and every reply fits that.

**Cause.** Found in code: src/director/purpose-scene.ts set `story` only for a news story read and a reporter's comment call; for `press.exposed` nothing read the finding the record names (`crime:<id>` bribe-taken, or `award:<id>` conflict-of-interest with the firm, its owner and the relation, src/core2/modules/press.ts bribeAct and conflictAct). The outlet block read `said.outletId` with `core.organizations.get`, which holds organization ids, not outlet rows.

**Fix.** press.ts `exposedFinding` reads the finding from the exposure's own record: a bribe through corruption.ts `crimeRecord` and `wantedFacts` (the reader the bribe offer already uses), a conflict from the award id and the record's firm and owner. purpose-scene.ts makes the bribe's bill the scene's bill (so the vote's facts follow), and sets `found-bribe` / `found-conflict`, `briber`, `wanted`, `contract`, `firm`, `firm-yours` or `relative`, `knows-truth` (every exposure ran on the paper trail, so the engine's own lie arc catches a denial), `briber-close` (family or a friend by the tie) and `leak-from-briber` (the press tip's knower). The outlet block resolves an outlet row to its organization for any cause, and sets `outlet-newspaper`. The Words lead's lines go in; the lines they replace are deleted.

**Time box.** 4 hours for one Opus session at medium.

**Rules.** Ask why: every line is placed by a fact that cites the crime, the award or the tip behind it. No dice: the record places a line. No line changed only to pass a guard; the lines are the Words lead's; changed talks go to M5 as sheets; a played file at the exact head for the reader. Tests pinned to a named place and seed.

**Done when.** A second session plays a scandal call after a taken bribe is exposed and after a conflict on an award is exposed, in a drawn place, and the reporter names who paid and the vote, or the contract and whose firm; the call plays at all; a denial is caught by the papers; no reply speaks of minutes or signatures.

**Waits on.** Nothing.

**Files.** src/director/scandal-call.test.ts (new), src/director/scandal-call-printed.test.ts (new), src/director/purpose-scene.ts, src/core2/modules/press.ts, src/core2/modules/corruption.ts, data/english/parts/scene-talk.json

**Notes.** The interview thread builds reporter, press-story, subject and stand for interview-published on top of the outlet fix. Conflict calls are played on awards the game itself makes (see Nov 15, 12:45Z).

- Nov 15: carries the comment from the order fix (Account lead's ruling 08:49Z): `keepComment` keeps the scandal call, and the story quotes the official's own answer on the call (owning it, denying it or a lie), not a parting line; a call that ends without one prints a decline; with no call the story says nothing of comment. Played through the game's own call in src/director/scandal-call-printed.test.ts. An unattended official's answer is press-exposure-unattended-answer.
- Nov 15, 10:30Z, Words lead's rulings (rulings-f23b8d9a.md): the reporter promises only what prints. After a reason or a refusal once you answered, the reporter says the day it runs; after "Who told you that?" and a refusal, "Then I'll say you declined to comment." A fact the call's own answers set (`answered-on-call`) tells the two apart. "That goes in too." and "I don't have a good answer for you." are deleted (the three reason replies take the second's place). The opener for a relative who owns the firm and lives elsewhere is deleted: no relative in office lives apart from a firm owner in an opening world (four places and seeds checked).
- Nov 15, 11:20Z, second round (second reader and Words lead on 1a710444): the Words lead's wordings ("I couldn't say no to someone that close to me.", "I'll quote you on that.", "Run it, then. We're done.", "I thought I could keep family out of my vote.", "Then I have nothing for you."). Play did not follow a lie: the page (src/bench/story.ts `shownNode`) sent no lie branches, so after a lie the reporter said nothing and the call stopped. Now `playedNode` (scene-talk.ts) takes the outcome the records give, for the page, `replyInScene` and `lastAnswerAlong`. The three "if not" lines of this call are deleted, because the reporter always has the papers (`knows-truth`). Part 1 of the played file plays every line of the trees in a real game. The relative-elsewhere opener is filed as `scandal-call-relative-elsewhere-opener`.
- Nov 15, 12:45Z (Account lead, 12:11Z: a hand-copied record is not staging): the fixture conflict test is deleted. Conflicts now come from awards the bodies make on 2025-02-01, found and printed by the paper's own desk, at four pinned places: Wall, South Dakota (4668380, seed conflict-scan-1), Boyd, Texas (4809748, conflict-scan-17, a housemate's firm), Hayden, Colorado (0835070, conflict-scan-10) and West Hartford, Connecticut (0982660, conflict-scan-5). One official with two stories found the same day gets one call: the second is a moment with no call, and prints with no comment. Both stories called themselves the second; src/bench/printed-words.ts now tells two found the same day in award order.
