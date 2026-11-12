---
id: outcome-causes-health-programs-part-2-earned-income-credit-link
title: "An engine pays an earned income credit and the credit moves birthweight"
area: people
kind: wiring
priority: 2
size: M
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
source: split from outcome-causes-health-programs in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
---

**What.** The link eitc-to-low-birthweight waits on program.eitc-dollars, and no engine pays an earned income credit yet. Build the credit as a payment made from a household's earnings, then record its dollars as the link's cause and keep low birthweight as the outcome. Estimates and sources go in the parameter table.

**Cause.** Found in code: linkCoverage in src/core2/outcome-web-model.ts (line 456) leaves eitc-to-low-birthweight unwired; src/core2/data/outcome-web/coverage.json lists it under "waiting" on program.eitc-dollars, and no module under src/core2/modules mentions an earned income credit.

**Fix.** Add an earned income credit beside the existing household benefit payments (src/core2/jobs-benefits.ts), paid from the treasury to eligible households by earnings and children through the one payment writer, record its dollars as an engine measure, keep the low-birthweight outcome with base and source, and regenerate coverage.json.

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: an effect is a read, not a record, so the outcome is read by the engine that owns it through outcomeWebFactor or a kept measure that views and news read. No dice: the cause record moves the outcome by the link's researched size, never a roll. One rule, all 56 places: place facts live in data. One engine per mechanic: pay the credit through the existing benefit engine, not a new payer. Every dollar balances.

**Done when.** A second session runs a one-year played world (buildBenchWorld) in a drawn place and a seed the builder did not choose (both named in the PR body) and sees an eligible household receive the credit on the journal, the place's credit dollars rise, and low birthweight move after the link's lag, named by payment record id, the link key and the web month record id. coverage.json shows eitc-to-low-birthweight under wired and src/core2/outcome-web.test.ts lists it as built.

**Waits on.** Nothing.

**Files.** src/core2/jobs-benefits.ts, src/core2/modules/outcome-web.ts, src/core2/data/outcome-web/outcome-web.json, src/core2/data/outcome-web/coverage.json, src/core2/outcome-web.test.ts

**Notes.** Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have built a credit payment and a birthweight link; no player sees birthweight, and the credit would add a payment path beside the money system that exists.
