---
id: tests-corruption-smithers-nobody-learns-after-falling-out
title: "Corruption test: in Smithers, West Virginia nobody learns of a taken bribe after the two fall out"
area: gov
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by:
pr: 9710
after:
blocked-on:
root: none
lead: laws-effects
model: sonnet
effort: medium
source: views thread, Nov 16 (corruption test pin)
---

**What.** src/core2/corruption.test.ts, case "is known only to the two people, until one falls out with the other and tells someone", fails at Smithers, West Virginia (5474740), world seed 739dfec671ca78ca207719831d6902f3575dbe23613e48f1ae686e73c311b348: after the fixture sours the tie between the offerer and the official, nobody else holds the bribe's record ("expected 0 to be greater than 0", corruption.test.ts about line 205). The place passed the test's own check (two taken bribes, one between people where one leans toward telling), so it is not a place the test should skip. CI's M3-09 red at Auburndale, Wisconsin is probably the same case; its seed was not printed.
Seen: the old draw loop at CORRUPTION_SEED s34 (second draw) on the Train at ce78169a, the only red among seeds s11 to s50, and again at the pinned case on the Train at c0f54ca0 by `npx vitest run src/core2/corruption.test.ts`.

**Cause.** Found in code: src/core2/corruption.test.ts, the case "is known only to the two people, until one falls out with the other and tells someone" (about line 185), staged the falling-out as a fixed 5,000 hours lost. On the Train ties stand on more shared hours, so at Smithers that step moved the pair's closeness only from 0.979 to 0.960 and neither told anyone; the engine was right and the fixture was too small (acting CTO's trace on PR 9554, Nov 16 11:19Z).

**Fix.** PR 9710: the staged rupture takes the whole tie, as the test's comment said it must. Folded into the Train at f1ec70f9; the file passes whole there, Smithers included (39 of 39 on the Train with #9713 and #9710, Nov 16).

**Time box.** 2 hours, Sonnet at medium effort.

**Rules.** No dice: whether someone tells is the person's own lean, never a roll. A test never skips a place that meets its own check.

**Done when.** The pinned Smithers case passes on the Train with the reason named in the PR body by record (who fell out, who they told, the record that holds it), and a second session runs the file and sees every case pass, then replays the case in a drawn place.

**Waits on.** Nothing.

**Files.** src/core2/corruption.test.ts, src/core2/modules/corruption.ts

**Notes.**
Nov 16 (views thread): answered by PR 9710, the fixture's rupture sized to the tie; the Smithers case passes on the Train at 6e9df72b, so it is not an expected failure.
