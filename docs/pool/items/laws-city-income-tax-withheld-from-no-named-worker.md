---
id: laws-city-income-tax-withheld-from-no-named-worker
title: "City income tax withheld from no named worker in Prairie Village, Kansas (city-tax-reach.test.ts, replay cto1)"
area: laws
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: "effects thread, Nov 16, 2026, running the sales tax tests beside the sales tax base change"
model: opus
effort: medium
root: none
---

**What.** `src/core2/city-tax-reach.test.ts` fails at "a named worker had the city income tax withheld" with GOLDEN_PATH_SEED=cto1 in Prairie Village, Kansas. It fails the same on Train head ef70819622 without any change, so it is not the sales tax base. The sales tax half of the test passes. Seen: dev mode's reach of a city income tax law (who the law reached), which would name no worker.

**Cause.** Needs cause. Looked at: the test's own assertion at line 133; not followed into the withholding engine.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Fix at the root; never loosen the test.

**Done when.** The test passes at replay cto1 and a second session sees a named worker's withholding in dev mode's reach of the city income tax.

**Waits on.** Nothing.

**Files.** src/core2/city-tax-reach.test.ts

**Notes.** Effects thread, Nov 16, 2026: `GOLDEN_PATH_SEED=cto1 npx vitest run --dir . src/core2/city-tax-reach.test.ts` on ef70819622, red.
