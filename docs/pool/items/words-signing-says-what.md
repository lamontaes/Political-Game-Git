---
id: words-signing-says-what
title: "A signed or vetoed bill's scene says what the bill is about, from the bill's own name"
area: words
kind: feature
priority: 2
size: S
status: in-pr
claimed-by: story/director-signing-says-what
pr: pending
blocked-on:
lead: words
milestone: play-first
source: "director-recall-outcome-and-signing-narration, not done: the signing narration named the bill but not what it does"
claimed-at: 2026-11-10T00:40:00.000Z
---

**What.** When the executive signs or vetoes a member's bill, the sponsor's scene now says what the bill is about, using the English engine's own phrase for a bill's purpose (billNameOf(bill).purpose, such as "free fares on public transit"). The phrase is cited to the bill and the cause record and passed to the scene as the fact `does`, read by three narration pieces for a signing, a veto in person and a veto by phone.

**Rules.** No hand-written player text: the phrase is the English engine's bill name and the lines are bank pieces gated on the `does` fact. Wire to the world: the fact is read from the bill's sections on the legislature's record, never typed.

**Done when.** src/director/reads-wrong.test.ts, in a drawn place where an executive acts on another member's bill, composes the sponsor's signed or vetoed scene with a `does` fact cited to the bill, and the scene's text holds that phrase; the English guards and the families guard pass.

**Files.** src/director/purpose-scene.ts, data/english/parts/scene-talk.json, src/director/reads-wrong.test.ts

**Time box.** 1 hour.

**You will see.** "The mayor has signed Ordinance 2025-4, which is about free fares on public transit."

**Screenshot.** The sponsor's scene after a signing.
