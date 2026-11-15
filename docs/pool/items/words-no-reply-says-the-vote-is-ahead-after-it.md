---
id: words-no-reply-says-the-vote-is-ahead-after-it
title: "After a vote, the official never says the vote is still ahead"
area: words
kind: bug
priority: 2
size: S
status: in-pr
pr: 9399
standard: 2
claimed-by: account-lead-M4
after: words-a-line-ranks-by-every-fact-it-checks
blocked-on:
lead: words
model: sonnet
effort: low
root: none
source: Account lead, Nov 15 01:20Z; found measuring the ranking (Salem OH, seed rank-m4)
claimed-at: 2026-11-15
branch: claude/project-thread-irab2z
---

**What.** When a reporter calls after a bill's vote, the official's stall and deflect replies include lines that say the vote is still ahead: "I'm still reading the latest draft.", "I haven't seen the final language.", "I'm still reading it.", "They'll see when I vote.", "I'll have something to say after the vote.", "I'm not going to get ahead of the vote.", "I'll have more when the committee reports.", "I'm voting no, and I'll tell you why.", "I'm voting for it, and you can quote me."; the reporter presses back with "The vote's in two weeks. After is too late for my readers." and "Everybody else on the council has told me where they are."; and the close promises "We'll see how it holds up after the vote." Measured in Salem, Ohio (seed rank-m4): 21 stall and deflect spots after the vote offered them. Each is false once the vote is recorded. Seen: in the replies the player picks on the reporter's call after a vote.

**Cause.** Found in code: the twelve pieces in data/english/parts/scene-talk.json fit the press-comment reply, follow and close spots in `useFit` (src/english/scene-talk-words.ts) with no guard on the vote; the packet already holds `vote-held` once the vote is recorded.

**Fix.** Each of the twelve pieces' press-comment uses gets `excludesFacts: ["vote-held"]`. No words change; the spots keep their other lines (a statement from the office, too early to say, the sponsor's question, the bill speaks for itself).

**Time box.** 1 hour for one session.

**Rules.** Replace, never layer: the guard is the existing `excludesFacts` on each piece, never a second filter in the composer.

**Done when.** A second session, on main, plays the reporter's call after a vote at a drawn place, names the place and seed, opens the reply menu at a stall or deflect, and reads none of the twelve lines, in the replies, the reporter's press-back or the close; and before a vote reads them still offered.

**Notes.** Nov 15: widened from seven to twelve lines at the Words lead's 02:14Z note. Not taken, for the reporter's-call thread: "{place} votes in November..." (the election, still true after the vote), "Half now, half after the vote?" (plays only before a vote), and a stated side needing the matching voted fact (plan part 1b).

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/english/stall-after-vote.test.ts (new)
