---
id: counted-saving-draw-not-normal
title: "A counted household's savings weight is drawn from a true normal, not from two hash units that move together"
area: world
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: T54
pr: "#9645"
after: counted-savings-banked-by-group
blocked-on:
root: none
lead: money
model: opus
effort: medium
source: "T54's trace of the town means at Staples CT, Tanapag MP and Maloata AS, Nov 16 02:29Z; Account lead's ruling 02:30Z (the draw fix goes first, as its own PR, B stacks on it)"
---

**What.** With each household opening at its survey median times its savings draw, the towns' mean cash ran 3.88, 5.11 and 3.75 times the median, where a log-normal of the survey's spread (σ 1.39) gives 2.63, though every record stood for one household. The draws' plain means were 4.19, 4.92 and 4.39 against 2.63, with top draws of 137 and 221. On the Train the same draw shares every counted group's cash, so a few households took most of their group's money and the rest held little: at Staples 75 counted and full people were jobless on day 2 (20 before #9117). Seen: dev mode's trace of a counted household (its savings draw), with the opening-savings fix on top.

**Cause.** Found in code: `savingWeight` (src/core2/counted-money.ts) made z by Box-Muller from two units, the FNV hash (`stableHash`) of the same key ending ":a" and ":b". FNV changes only the low digits for a different last letter, so the two units were the same to within 0.01 for all 50,000 keys tried, and z was a function of one unit, not a normal: 213 of 20,000 ids above 3 against 27.

**Fix.** z by Box-Muller on two of the world's seeded units (`seededFineUnit`, src/core2/seeded.ts, SHA-256), which are independent: 29 above 3 and 24 below −3 of 20,000, mean weight 0.9935. Fixed by the world's seed and the household's id, never redrawn.

**Time box.** 2 hours, Opus, medium.

**Rules.** No dice: a seeded draw of who exists, fixed by id. Estimate, never unknown: σ stays the survey's ESTIMATED row.

**Done when.** `saving-weight-draw.test.ts` shows the draw's tails and mean within the normal's own four-standard-deviation sampling range for 20,000 ids (226 above 3 on the base, red), and day-2 jobless at Staples, Tanapag and Maloata fall from 75, 101 and 100 with total cash unchanged. A second session sees in dev mode, at a drawn place it names with its seed, counted households' savings draws spread around one with no handful taking most of a group's money.

**Waits on.** Nothing.

**Files.** src/core2/counted-money.ts, src/core2/saving-weight-draw.test.ts (new).
