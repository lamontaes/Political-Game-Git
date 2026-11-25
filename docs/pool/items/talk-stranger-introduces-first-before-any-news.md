---
id: talk-stranger-introduces-first-before-any-news
title: "A resident the player has not met tells the paper's story before saying who they are"
area: director
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
source: "Words lead, Nov 14, 2026 (Sheridan WY played world, /mnt/project-files/words-lead/8831/part1-lines.md)"
model: sonnet
effort: medium
root: none
---

**What.** In Sheridan, Wyoming (seed 5c66d25fa63c1ee8adb53909d641ab9d36015cebcc0726284859fc46b07ea7aa, opened Oct 27, 2026 and run past the Nov 3 count) a resident the player has never met opens a talk with "Hi." and then the paper's story ("Tiffany Hill won the race for U.S. representative. Good night for our side.") and only after it says "I'm Benjamin. I don't think we've met." The player has no name for the speaker while being told their opinion. Seen: a stranger says who they are first, and the story follows once they have met.

**Cause.** Found in code: src/director/conversation.ts `openConversationNow` raises the brought-up news (`bringItUp`) before `mainTopic`, and `mainTopic` weighs the stranger's introduction (`here`) below any news; `introduction()` pushes it last in `subjectsBetween`. So whenever a story is told, the introduction is only reached afterward.

**Fix.** One rule: a talk with no scene occasion opens on the other person's unsaid introduction when they are strangers (`pendingIntroduction`), and the brought-up news and the main topic are told after the player's name, in the `here` answer step. The bring-it-up block moves into one function (`raiseBroughtNews`) used at the opening and after the name. A story told to the player today by someone else is still not told again (one telling for the house).

**Time box.** 3 hours for one Sonnet session.

**Rules.** No hand-written player text in code; no new lines (order only). No dice: the introduction leads whenever the record says the two have not met. A scene's talk keeps its occasion.

**Done when.** A second session, in a drawn place with its seed named, opens talks with residents the player has not met after an election and sees the introduction first and the story told after the player gives their name. Pinned: src/director/conversation-introduction-first.test.ts (removed) (Sheridan WY, seed above) fails without the change and passes with it.

**Waits on.** nothing.

**Files.** src/director/conversation.ts, (new)
