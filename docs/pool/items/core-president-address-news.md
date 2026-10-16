---
id: core-president-address-news
title: "The President's address is not carried as news when the press module is installed"
area: core
kind: bug
priority: 2
size: S
status: claimed
claimed-by: claude/president-address-news
pr:
blocked-on:
source: "words-needs-words-60 triage, Oct 16"
claimed-at: 2026-10-16T09:37:59.780Z
---

**What.** With the press module installed, the news module leaves stories to the press (`src/core2/modules/news.ts:434`) and the press never files the President's address, so `opening-story.test.ts` "is a public record the news carries" fails. Either the press files the address as a national story, or the test reads where the press carries it. The player should be able to read the address in the news.

**Rules.** Wire to the world: the story is read by the news screen and the journal. Replace, never layer: one place carries the address. No hand-written player text: the story is worded by the English engine.

**Done when.** In a drawn place and seed (named in the PR body) the opening's address is a news story with its record id in the press module's wire, the opening-story test passes, and a reader's news list shows it.

**Files.** src/core2/modules/press.ts, src/core2/modules/news.ts, src/director/opening-story.test.ts

**Notes.** From the Words session's notes (Oct 14).
