---
id: tests-small-dollar-lenders-wiring-slow-and-red-by-seed
title: "The small-dollar lender wiring test runs about ten minutes and fails by seed with a quote of 4.1 where 0.36 was expected"
area: laws
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "Account lead F1, Nov 14, 2026, gating #9078 (carries #8582)"
model: opus
effort: medium
root: rc10-screens-keep-own-facts
---

**What.** `src/core2/law-wiring-small-dollar-lenders.test.ts` follows the consumer-loan cap to the small-dollar lender's quote in a state that lets payday lending operate. It runs about ten minutes and in CI it failed on one draw, so a player who passes a loan cap may see a lender still quoting a rate far above it. Seen: the lender's quote on a resident's Money tab after the cap takes effect.

**Cause.** Measured: CI unit job on #9078 at d6e09c2e00a334a7ae0ac5cf386ab97765b4a9ca: case "binds the lender's quote where the state lets payday lending operate (seed 78301eb745f59b72e2f950b4a082cc0abefb078d)" took 569,912 ms and failed: `loan:small-dollar:household_fbb2951fb620abba:2026-08-01: expected 4.1 to be 0.36`. Run alone here, the file timed out at 1,500 s on #9078's head and on the train head 532d9303920eeb76718cc3a1e454414a8307fc88 alike, so the slow draw is on the train too and the failure is not shown to be #9078's. Not yet found: whether the quote is 4.1 because the cap's law row does not reach that household, or because the test draws a state where the cap is not in force; read the household's loan row and the law row that the quote cites for seed 78301eb7.

**Fix.** Replay the failing seed with a probe that prints the quote, the cap in force and the law row by id; then pin one place and seed from data for the case (skill `drawn-place-tests`) and fix the engine or the test, whichever the probe shows.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what is found, set the state honestly with a one-line note, and stop.

**Rules.** An effect is a read (owner, Oct 13): the quote is capped by a law row another engine reads. Ask why: the quote cites the cap law by id. Tests pick their place from data and finish in under about two minutes.

**Done when.** A second session, not the builder, runs the test file on main in a drawn place and in one place nobody chose, and every case finishes in under two minutes and passes, with the pinned place and seed named in the output and the quote equal to the cap.

**Waits on.** Nothing.

**Files.** src/core2/law-wiring-small-dollar-lenders.test.ts
