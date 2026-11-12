---
id: world-stopgap-place-prices-faked-mechanic
title: "Stopgaps in place-prices (faked-mechanic): 2 open"
area: world
kind: stopgap
priority: 2
status: dropped
standard: 2
claimed-by:
pr: #5729
after:
blocked-on:
lead: laws-effects
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/place-prices.ts, kind faked-mechanic"
claimed-at:
size: M
checked: fable 2026-11-10
---

**What.** The price engine charges container deposits to households under the live law, but container use and redemption still use household estimates rather than each person's purchases and returns, and a retail price law uses a stand-in. Charge and refund container deposits from each person's purchases and returns, and read a retail price law, then resolve both rows. A prior partial attempt was closed because it kept SG-GOV-REACH-B-retail-price open and proved only 40 days.

**Cause.** Found in code: `monthlyChange` in src/core2/modules/place-prices.ts (line 451) calls stopgap("SG-WORLD-prices-household-shares") and sizes container use from household estimates, and `readPriceLaws` (line 1058) uses a stand-in for a retail price law (SG-GOV-REACH-B-retail-price); both rows are open in src/core2/data/stopgaps/world.json and gov.json.

**Fix.** Charge and refund container deposits from each person's purchases and returns, and read a retail price law from the law in force, then resolve both rows.

**Time box.** 6 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One model, two tiers: each person's purchases and counted groups' purchases are priced by the same rule. No dice: returns come from the person's own choice. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session, on main in a drawn place (place and seed named in the PR body), plays a year in dev mode with a container deposit law in force and sees a named person charged at purchase and refunded at return, with the purchase, deposit and refund record ids. The test in src/core2/place-prices.test.ts and the stopgap tripwire test show both rows resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/place-prices.ts, src/core2/data/stopgaps/gov.json, src/core2/data/stopgaps/world.json, src/core2/place-prices.test.ts

**Notes.** First row: The price engine charges container deposits to full and counted households under the live law. Container use and redemption still use household estimates rather than each person's purchases and return decision.

Sent back 2026-10-20 from PR #5190 (branch claude/place-prices-stopgaps): merging main conflicts in src/core2/modules/place-prices.ts and data/content/trait-decisions.json (regenerate trait-coverage.json with scripts/traits/trait-coverage.ts after); finish on that branch, merge main into it first.

Sent back 2026-10-21 from PR #5729 (branch claude/political-game-pool-yucp92-bz): src/core2/container-deposit-law.test.ts:53 advances only 40 days, while docs/pool/items/world-stopgap-place-prices-faked-mechanic.md:20 requires a one-year buildBenchWorld proof with named purchase, deposit and refund records and the stopgap resolved. The diff keeps SG-GOV-REACH-B-retail-price open and explicitly says no purchase record exists; the other row is also unfinished. Complete those named records and the 365-day proof, or track this partial return-share change under a bounded item without completing the umbrella. The release declaration also says impact none although the journal charge/refund amounts change. No local gate pass is claimed.; finish on that branch, merge main into it first.
Stale 2026-10-26: PR #5729 closed (no push for five days, handed back); the work is on branch claude/political-game-pool-yucp92-bz; claim the item and merge main into that branch.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have priced container deposits per person and replaced a retail-price stand-in; no player sees either.
