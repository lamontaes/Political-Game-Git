---
id: press-comment-lie-claims-no-change
title: "After a vote, two lie lines claim the member was always for the bill, with no record of it"
area: words
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after: press-comment-why-answered-by-the-roll
blocked-on:
lead: words
model: opus
effort: medium
root: none
source: Account lead, Nov 16 00:41Z
---

**What.** On the reporter's call after a yes vote, the top lie reply is "I've always supported it." or "I've been for it from the beginning." Both claim that the member's position never changed, and no record backs that claim. #9584 deleted "My position hasn't changed since day one." for the same fault. Seen at Bagdad, Arizona (0405140, yes-vote-6:0), Downs, Kansas (2018500, yes-vote-3:0) and Dunthorpe, Oregon (4121215, pr-1:0) on #9584 at bee3f973.
Seen: on the reporter's call after the player votes yes, as the lie reply.

**Cause.** Found in code: both lines in data/english/parts/scene-talk.json carry only `excludesFacts: ["voted-no"]`. `voteStandFacts` in src/director/vote-stand-facts.ts serves no fact for whether the member's stated position and vote agree over time. A line may say only what its fact reads (Words lead, Nov 15).

**Fix.** Coordinate with the lying thread (lying, cmsg …H4Rvg6bwBpK4aHiAGmW1PN), which owns how a lie is caught by records, so the two pieces of work do not collide. Then either gate both lines on a record that the member's stance on the question agreed with their vote from its first statement, or have the Words lead delete them. A lie the records can catch is the lying thread's to wire.

**Time box.** 1 hour, one Opus session at medium. The lines are the Words lead's.

**Rules.** Ask why: a claim about the member's past stands on the stance record that holds it, cited by record id, never on a line that is simply there.

**Done when.** In a played world built by `buildBenchWorld` at the pinned place Bagdad, Arizona (yes-vote-6:0), the reporter's call after a yes vote, tapped by presses in a pinned test, offers a no-change lie only when the stance record backs it, or offers none. A second session plays the call and sees it.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/director/vote-stand-facts.ts

**Notes.**
