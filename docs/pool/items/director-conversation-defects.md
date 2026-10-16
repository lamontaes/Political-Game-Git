---
id: director-conversation-defects
title: "Conversations repeat themselves: the line just said is offered again, an echoed sighting, a repeated work line"
area: director
kind: bug
priority: 2
size: M
status: claimed
claimed-by: claude/director-conversation-defects
pr:
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T10:57:32.472Z
---

**What.** Reviews of mined conversations found defects in the director logic rather than the words: the player is offered "I'm at {my-employer}." right after saying it; the player echoes the other's sighting ("I saw Trevor Chambers today." twice); a person says "I'm with McMillan's Kitchen." and two turns later raises "I work at McMillan's Kitchen." because `otherRaises` does not see that their work was already said as a reply; and turns ask too much for real talk. Fix each at the root in `src/director/conversation.ts`. A talk should then read like two people.

**Rules.** No hand-written player text: the fix changes which line is offered, not a line. Ask why: a line not offered because it was said cites the earlier turn. No dice.

**Done when.** In a drawn place and seed (named in the PR body) the measure script scripts/english-corpus/measure-conversations.ts over three towns shows none of the four defects, and tests in src/director/conversation.test.ts cover each (a work line said as a reply is not raised again).

**Files.** src/director/conversation.ts, scripts/english-corpus/measure-conversations.ts

**Notes.** From the Words session's notes (Oct 12). Verify each against main first; some may be fixed.

Checked 2026-10-16 (claude session) against main: 96 talks of up to eight turns each in six generated towns (seeds s1 to s6) show none of the first three defects: no offered reply is a line already said (the player's "I'm at {employer}." is not offered again), no line repeats from the same speaker except one parting word, and no employer is named twice by one speaker. The one defect left was a parting word equal to the greeting ("Nice to see you." opening and closing a talk); the farewell now tries a further wording of the same move when its text was already said in the talk (src/director/conversation.ts, `endConversation`), tested in conversation.test.ts. "Turns ask too much" is a judgment on the mined banks' question rate and stays with the Words line's measure script.
