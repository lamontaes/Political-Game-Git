---
id: words-arc-variant-again-floor
title: "The bribe second-ask test allows an asker who never presses again: pull at the floor zeroes the again variant"
area: words
kind: bug
priority: 2
size: S
status: done
claimed-by: story/arc-variant-again-pull
pr: #8090
blocked-on:
lead: words
source: CI red on #8087 and on clean main, seed b1659aa066afd1da (Tallaboa, Puerto Rico)
claimed-at: 2026-11-10T02:10:00.000Z
---

**What.** The arc-variant test "plays a second ask from the same person" expected the again variant to score above zero on every second offer. The score is the world's terms times one plus the asker's pull (arc-variant.ts, chooseVariant), and an asker at -1 on every facet the again variant lists (persistent, assertive, competitive, argumentative) has a pull of -1, so the again variant scores exactly 0 for them however plain the earlier refusal. On seed b1659aa066afd1da the drawn asker's pull was -1.00, and the test failed on clean main.

**Rules.** No dice: the asker's traits decide whether they press again, and the test follows the engine instead of loosening it. Sliding scales: the score still slides with the refusal read for every asker above the floor.

**Done when.** src/director/arc-variant.test.ts passes in the played world drawn for seed b1659aa066afd1da (Tallaboa, Puerto Rico), where the asker's pull is -1.00 and the again variant scores 0, and still expects a score above 0 for every asker above the floor; the test logs the asker's pull.

**Files.** src/director/arc-variant.test.ts

**Notes.** Found while checking #8087's unit run.
