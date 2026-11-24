---
id: dev-mode-vouchers-reach-school-zero
title: "School vouchers pay families $655,000 and the law page shows the school with $0"
area: laws
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
source: Laws thread's dev-mode gap list from the three industry-law traces and the Account lead's industry report (/mnt/project-files/laws/reports/dev-mode-gaps-from-industry-traces.md); filed on the lead's ruling, Nov 16, 2026, under the owner's rule of Nov 16 that whatever a session traces by script dev mode should show
model: sonnet
effort: medium
root: rc8-law-judged-by-paperwork
---

**What.** Starting school vouchers in Illinois paid $655,000 to 2,237 counted families at Metamora. Dev mode's law page names the private school, Martinez Academy, with $0, and its sales fell 0.9%. Either the vouchers never reach the school's books or the reach is not written under the school. Seen: dev mode's law page for school vouchers.

**Cause.** Needs cause. Looked at: Metamora, Illinois (1748606), seed ilt-metamora, vouchers enacted for 365 days against the same world with no law (stores-health-services.md finding 9): $655,000 paid to 2,237 counted families, the school shown with $0. The voucher payments are made in src/core2/law-reach/group-b-money.ts; whether any reaches the school's books was not traced.

**Fix.** None until the cause is found.

**Time box.** 2 hours for one Sonnet session at medium effort.

**Rules.** Every effect can be triggered from the game's own code in dev mode and its effect seen and traced there: this item is the trace a script needed. Wire to the world: the fix reads the reach and trace records the engines already keep and adds no second reader.

**Done when.** A second session, in dev mode in the running game at a place and seed it chose with a private school, starts vouchers, advances a school term and opens the law page: the school is shown with the voucher dollars its books received, by record id, and the families with what they were paid.

**Waits on.** Nothing.

**Files.** src/core2/law-reach/group-b-money.ts, src/core2/law-reach/group-b.ts
