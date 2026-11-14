---
id: legislature-vote-keeps-the-reason-given
title: "A member's vote keeps the reason they gave a reporter, so the paper quotes the reason and a door or a rival can read it"
area: gov
kind: feature
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Words lead rulings 91 to 98 (Nov 14) and the Account lead's routing (Nov 14 05:28Z)
claimed-at:
---

**What.** The reporter's call after a vote asks "Why?" and the player picks a reason; today the vote record has nowhere to keep it, so the paper prints only the last line said. Keep the reason the player pressed on the vote record, and let the paper's story, a door and a later race read it. Seen: the paper's story of the vote quotes the reason the member gave, in their words.

**Cause.** Found in code: the player's vote is a `choices` row `{id, vote}` written by `castMemberVote` in src/core2/modules/legislature.ts; the roll copies only the vote and a computed `MemberPosition` onto the `vote:` row, and for the player that position is what the character would weigh, not what they chose to say. `keepComment` in src/core2/modules/press.ts quotes the text of the last reply, not a reason.

**Fix.** Add an optional `reasonGiven` (one of `views`, `town`, `deal`, `record`, `sponsor`) on the existing `vote:` row, written by one new function `giveReason(api, billId, memberId, reason, replyId)` after the roll, citing the reply's record id. Nothing grows: it is a field on a row that already exists. It stores only what the player pressed; unattended members leave it empty unless the engine already holds why they voted. `keepComment` and the story builder read `reasonGiven` from the vote row.

**Time box.** 4 hours for one Sonnet session. When it runs out, push what passes and set the state honestly.

**Rules.** Wire to the world: the field is written by the reply the player chose and read by another engine (the paper's story). Ask why: the quote names the reply's record id. No dice.

**Done when.** A second session, in a drawn place with a fresh seed in dev mode, votes as a seated member, takes a reason in the reporter's call, and sees the vote row carry `reasonGiven` with the reply's record id and the paper's story of that vote quote the reason; the same check in two more drawn places. A test names the places and seeds.

**Waits on.** Nothing.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/press.ts, src/bench/printed-words.ts

**Notes.** Drafted by the Account lead's builder (S5) Nov 14 from /mnt/project-files/words-lead/8910/pool-item-reason-on-the-vote.md.
