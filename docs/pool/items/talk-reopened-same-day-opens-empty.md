---
id: talk-reopened-same-day-opens-empty
title: "A talk opened again with someone the same day opens with no lines and no choices"
area: words
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
model: sonnet
effort: medium
root: none
source: Found while gating #9374 (Nov 15); red on the train from 2190669e through c295b5d2
---

**What.** `src/director/conversation.test.ts` "records talking as time together, and passes news the other hasn't heard" (Jackson Center, Ohio, seed conversation-test) fails with `TypeError: Cannot read properties of undefined (reading 'key')` at `talk.choices[0]!.key`: the talk opened with person_01bcdf1060f78734 on 2021-01-03 has `lines: []` and `choices: []`. The same person's talk had choices a moment earlier (the test's own `find` opened one), and run alone (`-t "records talking"`) the same talk opens with "Good to see you." / "Stephen, last I saw you was a few days ago." / "Did you ever meet my uncle, David? Lives out in Shelby County." and two answers, so what the earlier talks that day used up leaves nothing to open on. Seen: talking to someone a second time the same day, the talk box opens empty with nothing to say and no way out but closing it.

**Cause.** Measured: `npx vitest run src/director/conversation.test.ts` (Jackson Center, Ohio, seed conversation-test) is red on the train at 2190669e, 07919bd2 and c295b5d2, green at d074b2a4 (which held the train only to 6e304e09), so a fold between 6e304e09 and 2190669e changed it; the empty talk is the second `openConversation` with the same person on the same day after earlier talks in the file. Not traced past that: which subject or greeting rule leaves nothing (used subjects, the day's greeting once, the news held back) is the first step.

**Fix.** Trace why the reopened talk has no opening line; a talk with nothing left to say should not open (the person is not offered to talk to), or open on a line the engine has and a way to close. Do not change the test to skip the case.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Ask why: name the rule and record that leaves the talk empty before changing anything. No line changes only to pass the test.

**Done when.** The test passes in the full file run on the train; a second session, on main, in a drawn place, talks to the same person twice in one day and never sees an empty talk box.

**Waits on.** Nothing.

**Files.** src/director/conversation.ts, src/director/conversation.test.ts
