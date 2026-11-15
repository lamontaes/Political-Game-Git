---
id: laws-web-carried-price-laws-traced
title: "A law the outcome web carries into prices names no business it reached: tariffs, a bottle deposit"
area: laws
kind: bug
priority: 1
size: S
status: in-pr
standard: 2
claimed-by: claude/project-thread-8fxsy5
pr: 9516
after:
blocked-on:
lead: laws-effects
source: Account lead thread "Check state and federal laws take effect", Nov 15, 2026 (/mnt/project-files/laws/take-effect.md); built as one rule for the class by the account lead's call, Nov 15 07:39Z
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** When Congress raises tariffs or a state enacts a bottle deposit, the town's businesses charge more after the outcome web's lag, but the law's page and dev mode's bill card name no business and show no dollar. The owner's rule is that every law's effect can be triggered in dev mode and traced there. Seen: the law page's "What this did" and dev mode's bill card a year after Congress raises tariffs.

**Cause.** Found in code: `reviewBusiness` (src/core2/finance-state.ts) multiplies each business's price by the web's factor on `household.prices` (`webFactorFor`), whose running links include `tariffs-to-prices` and `container-deposit-to-prices` (data/research/outcome-web/links.json); nothing writes a law-reach row for it. Measured: Eveleth, Minnesota (2719934), world seed 9ea5b0b1cf7f19c41c24ddba458a95377a45443e44227b6ec9f33db30cc8c8ad, a bottle deposit enacted and six months run: the law's reach holds no business.

**Fix.** `traceWebPriceLaws` (src/core2/law-reach/web-price-trace.ts, new, reached through src/core2/modules/outcome-web.ts), called by `reviewBusiness` before the book moves on, writes, for each link in the factor the business's price carried since its last review whose cause is a law, a `lawApplied` row on the business for the law in force the link's lag earlier. The amount is the part of the period's sales that factor added, split among those links by each one's share of the factor's logarithm, so the parts add up to the whole. The links are read from the web's month row that review stood on (`webReachInMonth`, src/core2/outcome-web-reach.ts), so a link that starts in between is not credited with another's dollars. After a repeal the web still carries the law for its lag; those dollars go onto the law's ended row (`lawApplied` with `lingering`), which is never reopened. `lawReach` (src/core2/law-reach/applied.ts) lists the organizations it reached with their money; the law page (`lawDid`, src/bench/law-did.ts, shown in src/bench/play.mjs) and dev mode's bill card (src/bench/dev-mode.ts, src/bench/ui/dev-bill-card.mjs) name them. It reports only: no price, sale or other record changes. The player sees it on the law page and the bill card.

**Time box.** 4 hours for one Opus session at medium effort.

**Rules.** An effect is a read, not a record: the row is written where the price engine reads the law's link, never beside it. The chain is the acceptance. No dice.

**Done when.** A second session, not the builder, starts the bench in a drawn place, writes down the place and seed, and in dev mode passes a Congress bill raising tariffs; after running past the year's lag, the bill card and the law page name the town's businesses whose prices rose and show the dollars.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/web-price-trace.ts (new; the price engine reads it through src/core2/modules/outcome-web.ts), src/core2/finance-state.ts, src/core2/outcome-web-reach.ts, src/core2/modules/outcome-web.ts, src/core2/law-reach/applied.ts, src/bench/law-did.ts, src/bench/play.mjs, src/bench/data/controls.json, src/bench/dev-mode.ts, src/bench/ui/dev-bill-card.mjs, src/core2/web-price-trace.test.ts (new), src/core2/law-wiring-prices.test.ts
