---
id: talk-reopened-same-day-opens-empty
title: "The talk test opened the same person twice and failed when the second talk had nothing to say (test only)"
area: words
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9426
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: Found while gating #9374 (Nov 15); red on the train from 2190669e through c295b5d2
---

**What.** `src/director/conversation.test.ts` "records talking as time together, and passes news the other hasn't heard" (Jackson Center, Ohio, seed conversation-test) failed with `TypeError: Cannot read properties of undefined (reading 'key')` at `talk.choices[0]!.key`: the talk it opened with person_01bcdf1060f78734 on 2021-01-03 had no lines and no choices, because the test had already opened a talk with the same person (its own `find`). No player meets this: the bench opens no talk when there is nothing to say (Nov 1 rule). Guards: the conversation test runs its talk on a person it has not already talked to that day.

**Cause.** Found in code: commit 60328c5a (bisected by Words builder A, Nov 15) stopped someone with contact today from introducing themselves again; the test's second `openConversation` with the same person had passed before only because it repeated the introduction.

**Fix.** PR #9426 changes the test to open each person once (the person under test is not first opened by the `find`). No engine change.

**Time box.** 1 hour for one Sonnet session at medium effort.

**Rules.** Ask why: the fix names the commit and rule that left the second talk empty before changing the test.

**Done when.** The test passes in the full file run on the train; a second session, on main, in a drawn place, talks to the same person twice in one day and is offered no empty talk box.

**Waits on.** Nothing.

**Files.** src/director/conversation.test.ts
