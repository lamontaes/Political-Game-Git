---
id: words-home-news-talk
title: "Bad news at home has words for both sides: the one who brings it softens it, the one told asks or comforts, and the scene web counts them"
area: words
kind: feature
priority: 1
size: S
status: done
claimed-by: words/home-news-talk
pr: #6360
blocked-on:
source: "CTO, Oct 27 16:00 UTC: home scenes speak only through the narrator; order by rows that fire with no lines by speaker"
lead: words
milestone: play-first
claimed-at: 2026-10-27
---

**What.** A household's bad news (a lost job, a death, a serious illness, a prison sentence) stages `news-arrives`. Its talk runs through the conversation bank, which had one way to say "I lost my job" and two or three for the others. The scene web counted none of it, so the report showed these scenes speaking only through the narrator. This item writes both sides from the packet `news-at-the-table`: the bearer who softens it, and the one told who asks, comforts or reaches for them. It also teaches the scene web to count conversation lines by speaker.

**Rules.** Serves `scene-standard`: lines vary and say only what the facts carry (the relation's name, no time of day). No hand-written player text in code: every line is a bank piece. Ask why: the report's line count reads the banks, not a list.

**Done when.** Each of job-lost, death-news, illness-news and prison-news has at least four raises, and its reply subject at least two new answers. `npm run scene-web` counts a type's conversation lines as bearer and hearer, through `scripts/scene-web/talk-subjects.json`, regenerated in a buildBenchWorld drawn place with its seed named. `english-parts-banks` and `conversation.test.ts` pass.

**Time box.** 2 hours.

**You will see.** "Sit down a minute. Your grandmother died." or "I need to tell you something. I lost my job.", and an answer that isn't always "I'm sorry."

**Screenshot.** The home-and-family rows of `docs/reports/scene-web.md` in the PR body, with bearer and hearer counts.

**Files.** data/english/parts/conversation.json, scripts/scene-web/build.ts, scripts/scene-web/talk-subjects.json

**Notes.** Packet: `docs/design/scenes/from-life/news-at-the-table.md`.
