---
id: research-opening-family-links-by-relation
title: "Research: how many living relatives an adult has, by kind of relative"
area: core
kind: research
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: researcher
model: sonnet
effort: medium
root: none
source: stand-in triage T5, Nov 10, 2026 (docs/stopgaps/triage-2026-11-10/p8.md)
---

**What.** The opening gives almost every resident a relative (99.9 to 100 percent) and 3.6 to 4.9 family links each, every link mutual. Real adults differ: some have no living kin nearby and the mix of parents, siblings, children and others varies with age. Find the real counts so the opening's totals can be checked against them. Closes SG-P8-family-network-coverage.

**Cause.** Found in code: src/core2/population.ts line 603 (`stopgap("SG-P8-family-network-coverage")`) in the opening generator; src/core2/opening-family-coverage.test.ts prints the measured share with a relative and links per person.

**Fix.** Find, with year and unit, the share of adults with each kind of living relative (parent, sibling, child, grandchild) by age band from a published kinship source (Census SIPP or ACS household relationship tables; Pew or NSFH counts of living kin where they exist), record it in data/research/core/ with a reader in scripts/research/, add the ranges beside the test's print, and set the row's `replacement` to name the file. If the opening's totals are outside the range, file the change as its own pool item with the measured gap; do not change the generator here.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note and stop.

**Rules.** Real figures check the opening's totals; they never pick one person's family. One rule, all 56 places.

**Done when.** A second session runs src/core2/opening-family-coverage.test.ts in a drawn place it names with its seed and reads the share with a relative and the links per person beside the sourced ranges for the same age bands.

**Waits on.** Nothing.

**Files.** src/core2/population.ts, src/core2/opening-family-coverage.test.ts, src/core2/data/stopgaps/p8.json
