---
id: director-conversation-defects
title: "Conversations repeat themselves: the line just said is offered again, an echoed sighting, a repeated work line"
area: director
kind: bug
priority: 2
size: M
status: done
claimed-by:
pr: #4714
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at:
---

**What.** Reviews of mined conversations found defects in the director logic rather than the words: the player is offered "I'm at {my-employer}." right after saying it; the player echoes the other's sighting ("I saw Trevor Chambers today." twice); a person says "I'm with McMillan's Kitchen." and two turns later raises "I work at McMillan's Kitchen." because `otherRaises` does not see that their work was already said as a reply; and turns ask too much for real talk. Fix each at the root in `src/director/conversation.ts`. A talk should then read like two people.

**Rules.** No hand-written player text: the fix changes which line is offered, not a line. Ask why: a line not offered because it was said cites the earlier turn. No dice.

**Done when.** In a drawn place and seed (named in the PR body) the measure script scripts/english-corpus/measure-conversations.ts over three towns shows none of the four defects, and tests in src/director/conversation.test.ts cover each (a work line said as a reply is not raised again).

**Files.** src/director/conversation.ts, scripts/english-corpus/measure-conversations.ts

**Notes.** From the Words session's notes (Oct 12). Verify each against main first; some may be fixed.

Sent back 2026-10-16 from PR #4714 (branch claude/director-conversation-defects): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.
