---
id: words-no-reply-says-the-vote-is-ahead-after-it
title: "After a vote, the official never says the vote is still ahead"
area: words
kind: bug
priority: 2
size: S
status: claimed
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

**What.** When a reporter calls after a bill's vote, the official's stall and deflect replies include lines that say the vote is still ahead: "I'm still reading the latest draft.", "I haven't seen the final language.", "I'm still reading it.", "They'll see when I vote.", "I'll have something to say after the vote.", "I'm not going to get ahead of the vote.", "I'll have more when the committee reports." Measured in Salem, Ohio (seed rank-m4): 21 stall and deflect spots after the vote offered them. Each is false once the vote is recorded. Seen: in the replies the player picks on the reporter's call after a vote.

**Cause.** Found in code: the seven pieces in data/english/parts/scene-talk.json fit the press-comment stall and deflect spots in `useFit` (src/english/scene-talk-words.ts) with no guard on the vote; the packet already holds `vote-held` once the vote is recorded.

**Fix.** Each of the seven pieces' press-comment uses gets `excludesFacts: ["vote-held"]`. No words change; the spots keep their other lines (a statement from the office, too early to say, the sponsor's question, the bill speaks for itself).

**Time box.** 1 hour for one session.

**Rules.** Replace, never layer: the guard is the existing `excludesFacts` on each piece, never a second filter in the composer.

**Done when.** A second session, on main, plays the reporter's call after a vote at a drawn place, names the place and seed, opens the reply menu at a stall or deflect, and reads none of the seven lines; and before a vote reads them still offered.

**Waits on.** Nothing.

**Files.** data/english/parts/scene-talk.json, src/english/stall-after-vote.test.ts (new)
