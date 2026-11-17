---
id: world-estate-unsold-home-holds-cash
title: "An estate whose house is still for sale holds every heir's cash until it sells, which may be never"
area: world
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
after:
pr: 0
blocked-on:
model: sonnet
effort: medium
root: none
source: "CTO, Nov 17, 2026, on #9852: a last owner's home holds probate open until it sells (estates.ts), and at two places it never closed"
lead: world
---

**What.** When the last owner of a home dies, probate puts the house on the market and the estate stays open until a buyer takes it, holding all of the decedent's cash. A town whose buyers do not come keeps the heirs waiting for years: at Trinidad, California (key 0680448) after three played years 10 of 17 estate homes were still listed, the oldest for 23 months. A lower asking price did not clear them (2% of value a month, tried and dropped): buyers take the nearest affordable home to their own willing price, so a lower price adds no buyer.
Seen: Journal and the heirs' balances in a town with an estate whose house does not sell.

**Cause.** Found in code: `distribute` in `src/core2/estates.ts` returned early (`if (sale?.status === "listed") { keepProbateOpen(...); return []; }`) before paying anything, and `keepProbateOpen` rewrote the probate row without the heirs and the will of the day of death.

**Fix.** At the probate close an estate whose house is still for sale pays its heirs the cash by the will or the law, taxes on the part paid, and keeps the sale for the house; the pass after the sale pays the proceeds to the same heirs on the whole estate's tax (the carry the trust pass already uses). The row keeps the heirs and will of the day of death. The check `src/core2/estates-unsold-home-pays-cash.test.ts` draws places, plays two years and fails on main.

**Time box.** 3 hours.

**Rules.** No dice; the heirs and the order are the law's and the will's; no typed number.

**Done when.** A second session plays two years in a drawn place with a house for sale from an estate (place and seed named) in dev mode and sees the heirs' cash paid at the probate close and the sale's proceeds reach the same heirs when it sells.

**Waits on.** Nothing.

**Files.** src/core2/estates.ts, src/core2/estates-unsold-home-pays-cash.test.ts
