---
id: story-opening-day-line-once-no-turn
title: "The first evening's day line plays once, and the address stops pivoting with a stock turn"
area: director
kind: cleanup
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/story-one-landing-no-turn
pr: 10014
after:
blocked-on:
lead: story
model: fable
effort: medium
root: none
source: owner, Nov 17, after playing v0.113.0 (the CTO's rows on #9750, 16:54Z)
---

**What.** "It's the evening of January 20. You stay in" plays twice on the first evening, and the President's address pivots between its points with a stock sentence ("Talking about a higher federal minimum wage brings me to...").
Seen: in the owner's sitting on v0.113.0, Nov 17, 2026.

**Cause.** Design: two paths say one line. src/bench/opening.ts composes its own landing line after the address and src/director/scene.ts composes the same arrival line when the evening's scene opens; the planner (src/director/speech-outline.ts) puts a `turn` move between every two points and before the theme, worded from five stock pieces in the opening-speech bank. The CTO's rows of Nov 17 on #9750 put both under the owner's delete ruling.

**Fix.** Delete the opening's landing line, the play screen's `landHome` and the browser check that pinned it; the director's scene is the one path. Delete the planner's turn blocks and the five `turn` pieces with their two slots; each point opens on its own.

**Time box.** 2 hours, the Story lead at medium.

**Rules.** Replace, never layer; one engine per mechanic (the director's scene says the arrival); no hand-written player text in code.

**Done when.** A second session starts a new life in a drawn place on main and sees the day line once after the address, and an address played to its end holds no sentence of the form "From X, let me turn to Y"; `tests/english-parts-banks.test.ts` and `src/director/home-alone-arrival.test.ts` pass.

**Waits on.** Nothing.

**Files.** src/bench/opening.ts, src/bench/play.mjs, src/director/speech-outline.ts, data/english/parts/opening-speech.json

**Notes.**
