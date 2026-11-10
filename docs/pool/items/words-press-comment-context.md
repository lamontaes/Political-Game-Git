---
id: words-press-comment-context
title: "A reporter's call names the story it is about, and the reporter's reactions stand on it"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: story/director-press-comment-context
pr: 8100
blocked-on:
lead: words
milestone: play-first
source: "owner could not follow the national reporter's lines (I'll hold the paragraph; That's a big claim; Then it says you were asked and didn't say): nothing before them said what the story or claim was"
claimed-at: 2026-11-10T04:00:00.000Z
---

**What.** A reporter's call about a vote or a bill now carries the fact `story`, the bill the record names (else the topic it is about), cited to the records it came from. The national arc's opening narration, greeting and question name it, and its reactions (hold, check, print, comment) say what they are about. The friendly arc's "paragraph" is now "the quote", which is what the member just said. Piece keys are unchanged, so grades carry over.

**Rules.** No hand-written player text outside the banks. Wire to the world: the fact is read from the bill and the cause record, never typed. One rule, all 56 places.

**Done when.** src/director/press-comment-context.test.ts, in a drawn place, plays a member's vote, composes the reporter's call with a `story` cited to the bill and vote records, says all five arcs from those facts, and finds the national opening naming the story and no line leaning on "the paragraph", "your neighbors" or an unintroduced claim; director.test.ts, the families guard and the English guards pass.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, data/english/grade-map.json, src/director/press-comment-context.test.ts

**Time box.** 1 hour.

**You will see.** "Leonard Clark writes for WQGB-TV, and the recorder is already running. The piece is about Ordinance 2025-1."
