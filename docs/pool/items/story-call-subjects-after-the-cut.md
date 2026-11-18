---
id: story-call-subjects-after-the-cut
title: "A phone call has something to talk about again: the news answer and work talk come back first"
area: words
kind: feature
priority: 1
size: M
status: in-pr
standard: 2
claimed-by: claude/story-call-subjects
pr: 10063
after:
blocked-on:
lead: story
model: sonnet
effort: medium
root: none
source: CTO, Nov 18 18:27Z on the Story thread (issue 9750), ruling on the cut's ask 3
checked:
---

**What.** A call opens only when the two people have something to talk about, and the cut of Nov 17 left no talk subject a call can carry. So the player can call no one: the phone list offers nobody, and a call to a housemate opens on nothing. Seen: the phone, any day of a new life.

**Cause.** Measured: `src/director/conversation-phone.test.ts` at its three pinned places (Cranston RI, Sumiton AL, Deepstep GA; seeds `b550a10bcd3bf708`, `18661a5958abacd3`, `5c1b2e77d3a94f10`) offers no call on days 0 to 300 on the cut (#10063), shown by `npx vitest run src/director/conversation-phone.test.ts`. The call's greeting and goodbye lines are written; every talk subject's lines in `data/english/parts/conversation.json` were deleted by the cut, and the conversation engine opens no talk without a line to say (src/director/conversation.ts).

**Fix.** Write the talk subjects again in the conversation bank, each through the engine's existing subject and its facts: first the news answer (the player's and the other person's view on a story both heard), then work talk (the other person's job, workplace and day). Each line names the fact it is about; replies are four stances in the player's voice. When the first subject lands, take the seven `it.fails` marks off the phone test's cases.

**Time box.** 4 hours.

**Rules.** No hand-written player text in code: every call subject's words come from the conversation bank, each line naming the fact from the record it is about. The player says only what they chose (scene-standard rule 12), so each reply is a stance the player picks.

**Done when.** A second session, in a drawn place, calls a housemate and a coworker and each call opens on a subject from the record (a story both heard, or work); the phone test passes with its `it.fails` marks taken off; every new reply pair has a fresh reader's verdict.

**Waits on.** Nothing.

**Files.** data/english/parts/conversation.json, src/director/conversation-phone.test.ts

**Notes.** Nov 18 (Story): filed on the CTO's ruling; the seven phone cases carry `it.fails` naming this item on #10063.

Nov 18 (Story): built on claude/story-call-subjects. A Sonnet helper wrote 212 news and work rows in the conversation bank. The lead fixed the hello split: `openConversationNow` in src/director/conversation.ts split the opener only for keys with `.greet-open-`, and the kept openers are `greet-opener`. The lead also reworded five greeting rows the cut kept: the player's own hello, and three greetings that asked a question the caller talked past. All eight phone cases pass at their seeds with the seven `it.fails` marks off. No judged pairs rule reads the conversation bank: `reply-second-move-follows-the-first` reads scene-talk, and `names-something-specific` is awaiting-test, so its lines play. Closed-place news and the work-day talk were not reached in a played talk.
