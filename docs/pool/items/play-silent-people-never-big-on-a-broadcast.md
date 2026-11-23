---
id: play-silent-people-never-big-on-a-broadcast
title: "The household stays small while a speaker is heard on a set"
area: play
kind: bug
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: play
model: sonnet
effort: medium
root: design-director-on-core2
source: carryover N16-43 (The Governor talks while the household is shown big), owner's Nov 17 ruling "silent people never shown big"
checked: sonnet 2026-11-23
---

**What.** When a speech is heard on a set, the speaker is on the LIVE corner and the household listens on the talk strip, shown at the large one-to-three-person size and lit alike. The owner ruled on Nov 17 that silent people are never shown big, and this strip breaks it. Seen: at the home beat of an address heard on TV.

**Cause.** Found in code: `drawTalkStrip` in `src/bench/play.mjs` passes `speakingId` undefined when the speaker is not on the strip, and `#talk-strip .bust-strip[data-count]` in `src/bench/play.css` then sizes the busts at 200, 180 or 150 pixels with none quieted.

**Fix.** `drawTalkStrip` marks the strip `data-silent` when nobody on it speaks, and one CSS rule keeps that strip at the small 96 pixel size. No other strip or label changes.

**Time box.** 2 hours, one Sonnet session.

**Rules.** Replace, never layer: one size rule on the one talk strip, no second strip. One rule, all 56 places: no place is named in logic, and the check draws its place from all 56.

**Done when.** A second session sees, in the running game, in a drawn place from all 56, with a screenshot, the household on the talk strip small and unlit while the President or Governor speaks on the set, and large only for whoever speaks.

**Waits on.** Nothing.

**Files.** src/bench/play.mjs, src/bench/play.css
