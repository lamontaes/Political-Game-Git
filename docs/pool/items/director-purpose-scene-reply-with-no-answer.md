---
id: director-purpose-scene-reply-with-no-answer
title: "A purpose scene offers a reply nobody answers, and the scene stops on it"
area: director
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: thread cluster 29 part 3
pr: 9417
after:
blocked-on:
lead: words
standard: 2
model: opus
effort: medium
root: none
source: Words lead's read of a council member's year at Salado TX (seed review1:2, train 2190669e), Nov 15
checked: account lead 2026-11-15
---

**What.** In the two cause invites that played at Salado, Texas, three replies had no answer: "Who's going to speak for you at the council?", "Write it down and send it over first." and "That's already a lot of names." The player says one and the scene just stops. Seen: in any purpose scene's menu, a reply after which the other person says nothing.

**Cause.** Found in code: `src/director/scene-talk.ts` builds each reply's branch and words the asker's answer from the arc's follow moves (join-cause: an `ask` is answered with `answer`, a `deflect` with `press`). When no bank line for those moves can be worded with the scene's facts, it records the gap (`join-cause/follow/ask after ...`) but keeps the reply on the menu and ends its branch on a close, so the reply is offered with no answer.

**Fix.** A reply whose answer cannot be worded is taken off the menu; the gap stays listed for the bank. A menu left with fewer than two replies is no choice: the root skips the scene, a later node ends on its close. Where the reply taken off was the one the player's traits led to, the page follows the next one.

**Time box.** 2 hours for one Opus session at medium effort.

**Rules.** Rules 110 to 114 (owner, Nov 14): replies answer; choices look like choices. No line changes in the banks only to pass the test; the Words lead writes the missing answers.

**Done when.** A test pinned to a named place and seed stages cause invites about the two Salado questions and finds every offered reply answered (it fails on the train before the change). A second session plays a year in a drawn town and meets no purpose scene that stops on the player's reply.

**Waits on.** Nothing.

**Files.** src/director/scene-talk.ts, src/director/scene-replies-answered.test.ts (new)

**Notes.** Filed by hand from the Words lead's Salado read (/mnt/project-files/words-lead/regression/page-read-salado.md).
