---
id: people-trust-lost-share-sized-from-the-record
title: "What trust lost and a denied promise cost a tie is sized from what played worlds show, not picked"
area: people
kind: research
priority: 3
size: S
status: open
claimed-by:
pr:
after: people-broken-promise-costs-share-of-tie
blocked-on:
lead: people
source: S6, #9624 (Account lead, Nov 16 03:24Z: the two shares are from memory; the lying thread sizes them from the record)
standard: 2
model: sonnet
effort: medium
root: none
---

**What.** Two numbers say how much lost trust costs: `closenessTrustLostShare` (0.25), the share of a tie's hours that a lie found out or a broken promise takes, and `promiseDeniedShare` (0.5), the further share of that cost a denial takes. Both are ESTIMATED from memory. Neither is sized from anything the game records. Seen: src/core2/data/parameters.json and src/core2/data/promises/promise-kinds.json, the two rows' estimatedFrom and citation.

**Cause.** Found in code: src/core2/data/parameters.json `closenessTrustLostShare` came in with the lying PR on Nov 15, and DePaulo and Kashy (1998) give only its direction. The denial share replaced a fixed hour on Nov 16 (#9624), and its citation's "half" is the only basis.

**Fix.** Size both shares from played worlds. At three named places, record each lie found out and each broken promise, with the tie's hours before and after and what the two do next (talk again, stop talking, the one owed refuses an ask). Pick the share so ties that break apart in play match what the record shows, and give each row a citation naming that run. Retag each row ESTIMATED from the run, with its spread.

**Time box.** 2 hours, one Sonnet session at medium effort.

**Rules.** Estimate, never UNKNOWN: each number starts from a stated basis with its spread, and research calibrates the simulation without deciding any one person's outcome.

**Done when.** A second session reads both rows in the running game's parameter tables, each citing the run that sized it, and sees in dev mode, at a named place and seed, a lie found out and a denied broken promise move a tie by those shares.

**Waits on.** people-broken-promise-costs-share-of-tie (#9624).

**Files.** src/core2/data/parameters.json, src/core2/data/promises/promise-kinds.json
