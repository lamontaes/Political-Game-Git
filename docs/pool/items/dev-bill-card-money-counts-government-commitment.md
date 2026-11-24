---
id: dev-bill-card-money-counts-government-commitment
title: "Dev mode's bill card counts a government's own commitment as money moved"
area: play
kind: bug
priority: 1
size: S
status: claimed
standard: 2
claimed-by: Account lead thread "Check state and federal laws take effect"
pr:
after:
blocked-on:
lead: play-first
source: Account lead thread "Check state and federal laws take effect", Nov 14, 2026 (/mnt/project-files/laws/take-effect.md)
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Dev mode's bill card, the one screen built for tracing a law, shows "Money moved" of about minus $50 million for a state bill that raised the corrections line by a tenth and had paid $16.7 million by then. The total nets the state government's own row (minus $66.7 million, the year's pay the raise commits to the positions it funds) against the money actually paid. Seen: dev mode, Legislature, the bill's card, "Who it reached".

**Cause.** Measured: Eveleth, Minnesota (2719934), seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, Train 8b6c8903, state bill HF 5 (corrections +10%), run 100 days: `lawReach` gave amountMinor -5002940519 from a staffing row of -6670413408 and a treasury row of 1667472889. Found in code: src/core2/law-reach/group-a-staffing.ts `paysPositions` writes the paying government's own row (target its treasury organization, paid out negative, by design); src/core2/law-reach/applied.ts `lawReach` adds every row's amount into `amountMinor`; src/bench/ui/dev-bill-card.mjs shows that total as "Money moved".

**Fix.** In `lawReach`, a row on a government's own record (target "government", or a target that is a government's treasury organization) adds its amount to a new `governmentOwnMinor`, not to `amountMinor`; dev-bill-card.mjs shows it as its own line, worded in src/bench/data/controls.json. The engine's side line still shows its own amount.

**Time box.** 1.5 hours for one Opus session at medium effort.

**Rules.** Ask why: a total on the tracing screen sums only money paid. Replace, never layer: one reader (`lawReach`), changed in place.

**Done when.** A second session, not the builder, passes a state corrections raise in dev mode in a drawn place with no corrections employer in town; after the next monthly close the bill card's money moved is what the treasury paid, and a separate line shows the government's own commitment.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/applied.ts, src/core2/modules/budgets.ts, src/bench/ui/dev-bill-card.mjs, src/bench/data/controls.json, src/core2/budget-line-staffing.test.ts
