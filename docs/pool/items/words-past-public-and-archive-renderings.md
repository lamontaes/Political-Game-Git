---
id: words-past-public-and-archive-renderings
title: "Public-figure knowledge and the year-before news archive are worded as sentences on the card and in the news"
area: words
kind: feature
priority: 2
size: M
status: open
claimed-by:
pr: #5704
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** What a person knows about a public figure, and the year-before news archive, are kept as records but shown on the person card and in the news as raw facts. The English engine should word them as sentences from those records. PR #5704 adds a public-figure bank (data/english/parts/public-figure.json) read by the card and the news; the merger sent its first version back because it held authored shippable player text.

**Rules.** No hand-written player text: every sentence comes from the English engine's banks over record facts, written through the civic-prose process and never typed into a screen.

**Done when.** In a buildBenchWorld played world in a drawn place (seed named in the PR body), a person card shows a public figure's record worded by the English engine and the news shows a year-before archive item worded the same way, by record id, with src/bench/card-public.test.ts passing.

**Files.** data/english/parts/public-figure.json, src/english/mined/public-bank.ts, src/bench/card.ts, src/bench/card-public.test.ts

**Notes.** TODO

Sent back 2026-10-20 from PR #5216 (branch claude/words-past-public-archive): authored shippable player text (origin authored, shippable true) in data/english/parts/public-figure.json; finish on that branch, merge main into it first.

Claim released by the Oct 25 audit: no push in 72 hours (branch claude/political-game-pool-yucp92-bn last pushed Oct 20; PR #5704 stays open for the next builder).

Oct 25 audit: cleared a stale blocked-on (its item or PR is done, or the acting CTO's Oct 20 ruling lets any builder build the director side while every word comes from the English engine).
