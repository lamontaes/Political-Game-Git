---
id: words-goodbye-test-finds-goodbyes
title: "The goodbye test checks real goodbyes again"
area: words
kind: bug
priority: 2
size: S
status: open
claimed-by:
pr:
blocked-on:
source: added with npm run pool -- add
---

**What.** conversation.test.ts 'never parts with a word the talk already said' was red on main: in its fixed world every talk with someone the player knows ends on their answered question, where by the Nov 2 rule no goodbye is said, so the test found no goodbye to check (expected 0 to be greater than 0).

**Rules.** Never loosen a test: the check stays the same, over more talks.

**Done when.** The test checks the goodbye of talks with the people the player knows, then every other full person in the same world, and passes with goodbyes found.

**Files.** src/director/conversation.test.ts

**Notes.** TODO
