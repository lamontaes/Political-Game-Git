---
id: talk-news-told-only-when-said
title: "The player is on record as told news and blame that nobody said"
area: director
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/story-news-told-when-said
pr: 9938
after:
blocked-on:
lead: words
source: "Acting CTO's read of the Train at 892427ec, fault 3, Nov 15, 2026 (/mnt/project-files/account-lead/train/other-account-comments-9052.md); relayed by the Account lead"
model: sonnet
effort: medium
root: none
---

**What.** In Harper, Texas (new life at seed t1, born May 12, 1979), on January 28, 2025 the player only looks at the room at home and is put on record as told the story John saw on television (`heard:news.read:printed:outlet:television:3:...:governor.response:2025-01-21:2025-01-27`), with no talk opened. Before that day, the days' own room checks had already told the player a national law story nobody said. A talk that passes news over (watched together, the teller's own loss first, heard today from someone else, a printed story with no headline to say) did the same, with the blame too. Seen: the player is told news, and a blame, only when a line in a talk says it.

**Cause.** Found in code: src/director/bring-it-up.ts `bringItUp` wrote its `conversation.told` record (the heard and blame facts) before it returned its lines, and src/director/conversation.ts `raiseBroughtNews` then chose whether to say them. It drops them in four cases, and the room's check of who has something to say (`openConversation` with `look`, src/bench/handler.ts) runs the same path on every look.

**Fix.** `bringItUp` is split: `wordBringItUp` words the lines and writes nothing; `tellBroughtUp` writes the told record, with the blame only when the blame line is among the lines. `bringItUp` keeps both for its other callers. `raiseBroughtNews` tells the player only when the news was raised or its lines pushed, and never in a look.

**Time box.** 2 hours for one Sonnet session.

**Rules.** No new lines. No dice: the record follows what was said.

**Done when.** A second session, in a drawn place with its seed named, looks at a room at home where someone has news, sees no told record, then talks to them and sees the told record name only the news the talk said. Drawn: src/director/bring-it-up-told-when-said.test.ts draws its worlds from a base seed, looks at the room each day (nothing told), then talks, and fails without the change and passes with it.

**Waits on.** nothing.

**Files.** src/director/bring-it-up.ts, src/director/conversation.ts, src/director/bring-it-up-told-when-said.test.ts (new)

**Notes.**

- Nov 17: taken over from #9559 onto claude/story-news-told-when-said with a drawn-place test in place of the pinned one.
