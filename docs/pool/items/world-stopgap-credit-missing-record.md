---
id: world-stopgap-credit-missing-record
title: "Stopgaps in credit (missing-record): 1 open"
area: world
kind: stopgap
priority: 3
status: dropped
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: money
model: opus
effort: medium
root: none
milestone:
source: "src/core2/data/stopgaps.json, src/core2/modules/credit.ts, kind missing-record"
claimed-at:
size: M
checked: fable 2026-11-10
---

**What.** The bank holds opening mortgages whose original funding is an unmatched opening liability instead of named customer deposits. The money to back them is in the town, but moving it into deposit records takes it out of people's cash with nothing to offset it on the bank's side, so the offset needs a choice before the code: the ledger's opening-balance entry, or a one-time cut to every household's opening cash in proportion to its savings using a deposit-to-loan ratio from FDIC data with a spread. The choice is a stopgap to register, not a wait. Fund the opening mortgages from deposit records of named and counted households and clear the row.

**Cause.** Measured: Ingram, Texas, seed bank-probe-7a1, 40 days in: bank deposits $0.95M against opening mortgage funding of $12.30M (the unmatched liability), mortgages held $12.26M, bank cash $6.15M, and the 1,856 people holding $31.7M in cash between them. The marker is in `heldMortgages` use at src/core2/modules/credit.ts (line 420, SG-WORLD-opening-mortgage-funding, open in src/core2/data/stopgaps/world.json).

**Fix.** Fund the opening mortgages from deposit records of named and counted households using an ESTIMATED FDIC deposit-to-loan ratio, taking the money from households' opening cash in proportion to savings, and register the offset as a stopgap. Then resolve SG-WORLD-opening-mortgage-funding.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Estimate, never UNKNOWN: until named depositors exist the funding starts from the real deposit-to-loan average with a spread and a source. Wire to the world: the bank's books must balance. Replace, never layer: the fake is deleted in the same change, and a row is never closed by deleting it without the mechanic. Numbers go in the parameter table tagged SOURCED, ESTIMATED or TUNABLE.

**Done when.** A second session, on main in a drawn place (place and seed named in the PR body) and in Ingram, Texas with seed bank-probe-7a1, plays 40 days in dev mode, opens the bank's books, and sees the opening mortgages backed by deposit records of neighbors' savings by record id, with the balance sheet balancing. The test in src/core2/housing-mortgages.test.ts and the stopgap tripwire test show SG-WORLD-opening-mortgage-funding resolved.

**Waits on.** Nothing.

**Files.** src/core2/modules/credit.ts, src/core2/data/stopgaps/world.json, src/core2/housing-mortgages.test.ts

**Notes.** First row: The bank holds opening mortgages whose original funding is an unmatched opening liability, not named customer deposits. New savings deposits are actual journal transfers and are accounted for separately. Claim released Oct 23: branch gone.

Measured Oct 19 (claude/mortgage-funding, not built): Ingram, Texas, seed bank-probe-7a1, 40 days in. Bank deposits $0.95M; opening mortgage funding (the unmatched liability) $12.30M; mortgages held $12.26M; bank cash $6.15M; the 1,856 people hold $31.7M in cash between them. So the money to back the mortgages is in the town (39 percent of its cash), but moving it into deposit records takes it out of people's cash with nothing to offset it on the bank's side: the bank's cash does not rise because the mortgages were paid out long ago. Doing it needs a decision on the opening offset (the ledger's opening-balance entry, or a one-time cut to every household's opening cash in proportion to its savings, a deposit-to-loan ratio from FDIC data with a spread) before the code, and every test that sums opening cash will move. Suggested first step: the ratio, sourced, as an ESTIMATED parameter; then deposit records at the opening taken from households in proportion to their savings.

Deferred Oct 25: nothing on screen reads it yet.

Dropped Nov 10, 2026 (depth sweep): too in depth (owner, Nov 10). It would have named customer deposits behind opening mortgages; a bank's books are not on any screen.
