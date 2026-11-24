---
id: golden-path-m1-02-two-year-economy-check-takes-79-seconds
title: "Golden path M1-02 takes 79 s at CI because it plays two years of the whole economy"
area: gov
lead: governing
kind: bug
priority: 3
size: S
status: open
claimed-by:
pr:
blocked-on:
after:
source: account lead thread, Nov 14, golden-path quick job out of budget at M2-08
claimed-at:
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** At head b718411490d7 the quick golden-path job ran out of its 450 s budget at M2-08. M1-02 (the national economy and central bank, Ridgewood, New Jersey, seed 4f76e802069c3914723aad11a315bab328faf3c66c4ec6e783a1ed7664433966) alone took 78.8 s. Seen: the golden-path table of run 43633208622 and the local timing below.

**Cause.** Found in code: `src/core2/tooling/m1-02-check.ts` plays two years of every economy engine from the start date, about 0.09 s a played day after a 17.6 s build (measured Nov 14: 730 days about 86 s), and where the drawn town had no bank line open at a rate change a draw loop (`drawPlace` up to twelve times) ran further places, each another run.

**Fix.** One change to the check and the rows. The check names its own place and seed by design (Ridgewood, as above: a bank line is open at the first rate change on 2025-01-23) and its draw loop is deleted; it fails naming the place and the seed if the pin has no witness. It takes the days to play as an argument. Two rows run it: M1-02Q, 120 days in the quick job (37 s measured; it holds the first two rate changes, 2025-01-23 and 2025-03-20, with their votes, reasons and repricing), and M1-02, the two years, 730 days, in the long job with every assertion kept. Premise change, stated by the Account lead: the two years are the game's own played days, so the two-year check belongs in the long job; nothing it asserts is cut.

**Time box.** 2 hours for one sonnet session.

**Rules.** Speed: a spec's own limit is not loosened to get green; no assertion is dropped. Each row's comment says how many days it plays and why.

**Done when.** In a drawn place (Ridgewood, New Jersey, the seed above) M1-02Q runs in under 40 s and M1-02 passes in the long job, and a second session sees the quick golden-path table pass with M2-04, M2-09 and M3-09 reached.

**Waits on.** Nothing.

**Files.** src/core2/tooling/m1-02-check.ts, docs/roadmap/features.json, scripts/core2-guard/policies.json

**Notes.** Clause 1 of the check is unchecked by the owner's Nov 8 ruling. Filed by hand. Seen: M1-02Q at 37 s and the 730-day run at about 86 s in this container.
