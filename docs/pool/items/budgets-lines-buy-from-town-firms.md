---
id: budgets-lines-buy-from-town-firms
title: "Police, fire, health, corrections and other budget lines buy from the town's own firms, not only from outside"
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
source: "owner, Nov 16, 2026, 01:58Z (effects session: laws that reach industries wrongly); plan approved 02:08Z, item 4"
model: opus
effort: medium
root: none
---

**What.** A government's budget lines buy part of their work from private firms, and the contracts engine awards that work to a town firm when the line names the kinds it buys. Only six lines did. Police, fire, corrections, natural resources, higher education and other programs named none, so every dollar they spent on purchases left town. The health line named "enterprise:health-care" and "enterprise:health", which no town business has, so it never reached the town's clinic or care home, and administration named a "legal services" kind no business carries. A budget law raising those lines therefore never reached a town business. Seen: dev mode's reach of a budget bill raising the police or health line (who the law reached), which named no town business.

**Cause.** Found in data: `providers.lines` in src/core2/data/budgets/treasury-spending.json, read by `providersIndex` and the monthly line payments in src/core2/budgets-treasury.ts. Measured: at Center, North Dakota (place 3813180), seed town-buys, after 40 days no government had an award on police, fire, health, corrections or natural resources.

**Fix.** Rows for police and fire (repair shops and stores), corrections (kitchens, clinics, building services), natural resources (builders, professional offices), higher education (building services, kitchens) and other programs (professional offices), each an ESTIMATED share of the line with its spread. The health line names the town's clinics and care homes. Hospitals stay out until the industries thread gives them books. Administration drops the kind no business has. Nothing new in code: the existing awards and payments carry it.

**Time box.** 3 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the one contracts engine awards and the one treasury pays, with no second purchase path. Estimate, never UNKNOWN: every share is an ESTIMATED row with its spread.

**Done when.** A second session in a drawn place (named, with its seed) passes a budget bill raising the town's police line through dev mode, runs a month, and sees on the bill card's reach the town firm that won the police line's work, paid.

**Waits on.** Nothing.

**Files.** src/core2/data/budgets/treasury-spending.json, src/core2/town-buys.test.ts (new)

**Notes.** Effects thread, Nov 16, 2026. The health thread confirmed the health line's providers are not theirs (Nov 16, 04:53Z).
